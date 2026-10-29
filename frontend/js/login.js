async function login(){

 const email = document.getElementById("email").value
 const senha = document.getElementById("senha").value

 const resposta = await fetch("http://localhost:3000/auth/login",{

  method:"POST",

  headers:{
   "Content-Type":"application/json"
  },

  body: JSON.stringify({
   email,
   senha
  })

 })

 const resultado = await resposta.text()

 alert(resultado)

}