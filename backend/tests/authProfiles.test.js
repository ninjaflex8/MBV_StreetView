const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-for-auth-profile-tests";

const usuarios = new Map();
let proximoId = 10;
const dbPath = require.resolve("../database/connection");
const fakeDb = {
    promise() {
        return {
            async query(sql, parametros) {
                if (/INSERT INTO usuarios/i.test(sql)) {
                    assert.match(sql, /VALUES \(\?, \?, \?, 'cliente'\)/i);
                    const [nome, email, senha] = parametros;
                    const usuario = {
                        id: proximoId++,
                        nome,
                        email,
                        senha,
                        perfil: "cliente"
                    };
                    usuarios.set(usuario.id, usuario);
                    return [{ insertId: usuario.id }, []];
                }

                if (/WHERE email = \?/i.test(sql)) {
                    const encontrados = [...usuarios.values()]
                        .filter((usuario) => usuario.email === parametros[0])
                        .map((usuario) => ({ ...usuario }));
                    return [encontrados, []];
                }

                if (/WHERE id = \?/i.test(sql)) {
                    const usuario = usuarios.get(Number(parametros[0]));
                    return [usuario ? [{ ...usuario }] : [], []];
                }

                throw new Error(`Consulta de teste inesperada: ${sql}`);
            }
        };
    }
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb
};

const authRoutes = require("../routes/authRoutes");
const adminRoutes = require("../routes/adminRoutes");
const app = express();
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

let server;
let baseUrl;
let senhaHash;

function criarUsuario(id, nome, email, perfil) {
    usuarios.set(id, { id, nome, email, senha: senhaHash, perfil });
}

async function requisitar(caminho, { metodo = "GET", token, corpo } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (corpo) headers["Content-Type"] = "application/json";

    const resposta = await fetch(`${baseUrl}${caminho}`, {
        method: metodo,
        headers,
        body: corpo ? JSON.stringify(corpo) : undefined
    });

    return {
        status: resposta.status,
        json: await resposta.json()
    };
}

before(async () => {
    senhaHash = await bcrypt.hash("Senha123", 4);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
    });
});

test("cadastro, login, sessão e autorização usam o perfil do banco", async (t) => {
    usuarios.clear();
    proximoId = 10;
    criarUsuario(1, "Cliente Teste", "cliente@example.com", "cliente");
    criarUsuario(2, "Admin Teste", "admin@example.com", "admin");
    criarUsuario(3, "Removido Teste", "removido@example.com", "cliente");

    const cadastro = await requisitar("/auth/register", {
        metodo: "POST",
        corpo: {
            nome: "Novo Cliente",
            email: "novo@example.com",
            senha: "Senha123",
            perfil: "admin"
        }
    });
    assert.equal(cadastro.status, 201);
    assert.equal(cadastro.json.usuario.perfil, "cliente");
    assert.equal(usuarios.get(cadastro.json.usuario.id).perfil, "cliente");
    assert.equal(Object.hasOwn(cadastro.json.usuario, "senha"), false);

    await t.test("login de cliente e administrador não expõe o hash", async () => {
        for (const [email, perfil] of [
            ["cliente@example.com", "cliente"],
            ["admin@example.com", "admin"]
        ]) {
            const login = await requisitar("/auth/login", {
                metodo: "POST",
                corpo: { email, senha: "Senha123" }
            });
            assert.equal(login.status, 200);
            assert.equal(login.json.usuario.perfil, perfil);
            assert.equal(Object.hasOwn(login.json.usuario, "senha"), false);
            assert.equal(JSON.stringify(login.json).includes(senhaHash), false);
        }
    });

    const tokenCliente = jwt.sign({ id: 1, email: "cliente@example.com" }, process.env.JWT_SECRET);
    const tokenAdmin = jwt.sign({ id: 2, email: "admin@example.com" }, process.env.JWT_SECRET);
    const sessaoCliente = await requisitar("/auth/me", { token: tokenCliente });
    const sessaoAdmin = await requisitar("/auth/me", { token: tokenAdmin });
    assert.equal(sessaoCliente.status, 200);
    assert.equal(sessaoCliente.json.usuario.perfil, "cliente");
    assert.equal(Object.hasOwn(sessaoCliente.json.usuario, "senha"), false);
    assert.equal(sessaoAdmin.status, 200);
    assert.equal(sessaoAdmin.json.usuario.perfil, "admin");

    await t.test("a rota administrativa rejeita cliente e aceita admin", async () => {
        assert.equal((await requisitar("/admin/teste", { token: tokenCliente })).status, 403);
        assert.equal((await requisitar("/admin/teste", { token: tokenAdmin })).status, 200);
        const tokenComPerfilForjado = jwt.sign(
            { id: 1, perfil: "admin" },
            process.env.JWT_SECRET
        );
        assert.equal(
            (await requisitar("/admin/teste", { token: tokenComPerfilForjado })).status,
            403
        );
    });

    await t.test("token ausente, inválido ou expirado retorna 401", async () => {
        const tokenExpirado = jwt.sign(
            { id: 1 },
            process.env.JWT_SECRET,
            { expiresIn: -1 }
        );
        assert.equal((await requisitar("/admin/teste")).status, 401);
        assert.equal((await requisitar("/admin/teste", { token: "inválido" })).status, 401);
        assert.equal((await requisitar("/admin/teste", { token: tokenExpirado })).status, 401);
    });

    await t.test("usuário inexistente no banco retorna 401", async () => {
        const tokenRemovido = jwt.sign({ id: 3 }, process.env.JWT_SECRET);
        usuarios.delete(3);
        assert.equal((await requisitar("/admin/teste", { token: tokenRemovido })).status, 401);
    });

    await t.test("mudança de perfil no banco vale na próxima requisição", async () => {
        usuarios.get(2).perfil = "cliente";
        assert.equal((await requisitar("/admin/teste", { token: tokenAdmin })).status, 403);
        usuarios.get(2).perfil = "admin";
        assert.equal((await requisitar("/admin/teste", { token: tokenAdmin })).status, 200);
    });
});
