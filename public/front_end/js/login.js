
var ERROR_LOG =console.error.bind(console);
var appAddr="https://nwen304gropproject.herokuapp.com";
$(document).ready(function(e) {

	
	$('#log-in').button().click(
		
		function() {
			console.log("login front-end called");
		
	
			var password=  $('#password').val();
			var email = $('#email').val();
            // console.log("email:"+email);
            // console.log("ps"+password);
			console.log("111111");
			if(email == null || email == undefined || email == ''){
                alert("Please enter an email address");
                return;
			}else if(password == null || password == undefined || password == ''){
                alert("Please enter a password");
                return;
            }
			else{
				$.ajax({	
					method:'POST',
					url: appAddr+"/login_account",
					data: JSON.stringify({
						pword: password,
						emailadd: email
                	}),
	                contentType: "application/json",
					dataType: "json",
				}).then(my_nextfunction,ERROR_LOG);
				// window.location.href("../index.html");
				// window.close();	
			}
	});
	function my_nextfunction(accounts){
		//add tasks:
		
		alert("Register Successfullly");
		console.log("my next function called");
		accounts.forEach(account=>{
			displayHTML(account.fname,account.lname);
		});
	}
	function displayHTML(fname,lname){
		console("display function called");
		var text1=$('#login').text();
		console.log(text1);
		window.open("../index.html","_self");
		// $('#login').text("Welcome,"+fname+" "+lname+"!");
	}
	
});



