async function login(){

 const email = document.getElementById("email").value
 const senha = document.getElementById("senha").value

 const resposta = await fetch(`${window.MBV_API_URL}/auth/login`,{

  method:"POST",

  headers:{
   "Content-Type":"application/json",
   ...window.MBV_API_HEADERS
  },

  body: JSON.stringify({
   email,
   senha
  })

 })

 const resultado = await resposta.text()

 alert(resultado)

}