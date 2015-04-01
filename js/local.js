/*
 * local.js
 *
 * Cord Phelps
 * Copyright 2014, MIT License
 * http://www.opensource.org/licenses/MIT
 *
 * Software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

function localVars() {

    this.ajaxTimeout = 5000;
    this.ajaxError = false;
    this.authServerURL = '';

    this.debug = true;

    this.clientID = '<your clientID here>';
    this.authResult = '';
    this.authError = '';


    this.signedIn = false;
    this.email = '';
    this.network = 'unknown';
    this.token = '';
    this.tokenExpires = '';
    this.checkTokenURL = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=';

}


function connectUser() {   // if token exists: generate a new token
                           // if no token (due to browser logout), produce the google login screen

  console.log("\nvanilla login() (begin)\n");

  // hello('google').login()
  hello('google').login({display: "page", scope: "email", force: "true" }).then( 
    function(auth){
    	$('#loginBtn').text("hello('google').login(): have new token");
        console.log("connectUser(): hello('google').login(): have new token:\n" + JSON.stringify(auth));
        var currentTime = (new Date()).getTime() / 1000;
        var timeRemaining = (app.tokenExpires - currentTime ); 
        console.log("connectUser()" +
                    "\ntoken: " + app.token + 
                    "\nexpires: " + app.tokenExpires + 
                    "\ncurrentTime: " + currentTime + 
                    "\nremaining: " + timeRemaining + " seconds");
        app.signedIn = true;
    }, 
    function(e)   {
    	$('#loginBtn').text(" hello('google').login() get token error: " + e.error.message);
        console.log(" hello('google').login() get token error: " + e.error.message );
        app.signedIn = false;
        }
    );

  console.log("\nvanilla login() (end)\n\n");


}

function disconnectUser() {

  var sess = sessionActive();
  // full logout not supported
  hello('google').logout({force:false}).then( function(){
    showLocalStorage();
    console.log("hello().logout(), sessionActive: " + sess);
    app.token = "";
    $('#loginBtn').text("hello.on('auth.login'): get token");
    $('#tokenBtn').text('no token: (check current token again)');
    $('#disconnectBtn').text("hello().logout(): (disconnect again?)");
    }, function(e){
          console.log( "hello().logout() error: " + e.error.message + " sessionActive: " + sess );
          $('#disconnectBtn').text("error, hello().logout(): (disconnect again?)");
  });

}

function clearLocalStorage() {

	if (localStorage.hello) {
		localStorage.removeItem('hello');
		$('#holdingTank').text('cleared localStorage for key = ' + 'hello');
		console.log('cleared localStorage for key = ' + 'hello');
		app.token = "";
		$('#loginBtn').text("hello.on('auth.login'): get token");
  	$('#tokenBtn').text('no token: (check current token again)');
	}
	else {
		$('#holdingTank').text('localStorage for key "hello" not found');
	}


}

function showLocalStorage() {

	if (localStorage.hello) {
		//var token = localStorage.getItem('hello');
		var token = localStorage.hello;
		$('#holdingTank').text('localStorage for key ' + 'hello' + ':\n' + token);
	}
	else {
		$('#holdingTank').text('localStorage for key "hello" not found');
	}


}

function checkToken(token) {
// https://developers.google.com/accounts/docs/OAuth2UserAgent#validatetoken

  if (token == '') {
  	// clearLocalStorage() clears app.token
  	console.log("checkToken(): nothing to check")
  	$('#loginBtn').text("hello.on('auth.login'): get token");
  	$('#tokenBtn').text('no token: (check current token again)');
  	return
  }

  app.ajaxError = false;

  $('#tokenBtn').text('check current token ( working... )');

  $.ajax({
        url: app.checkTokenURL + token,
        dataType: 'json',    // the format of the response
        cache: false,
        contentType: false,  
        processData: true,    // do convert outgoing data to a string
        timeout: app.ajaxTimeout,                        
        type: 'get',
        complete : function(){
          // 
          },
        error : function(x, textStatus, errorThrown){
          app.ajaxError = true;
          // handle https errors coming from the server (for example, 403)
          // firefox: 'expired token' gets 'NetworkError: 400 Bad Request' 
          // chrome: 'expired token' gets "responseJSON":{"error":"invalid_token","error_description":"Invalid Value"},"status":400,"statusText":"OK"}
          // timeout gets textStatus = 'timeout' and errorThrown = 'timeout'
          console.log ("checkToken() x: " + JSON.stringify(x) + "\nerror: " + textStatus + " " + errorThrown + " " + x.status);

          if (errorThrown == 'timeout') {
          	$('#tokenBtn').text('token timeout: (check current token again)');
          }
          else if (x.status == '400') {
          	$('#tokenBtn').text('token expired: (check current token again)');
          }
          else {
          	$('#tokenBtn').text('token unknown error: (check current token again)');
          }

        },
        success: function(response) {
        	app.ajaxError = false;
        	// google sez its a token, but is it our token?
          	console.log("checkToken() result:\n" + JSON.stringify(response));

        	// check the audience 
        	if (response.audience == app.clientID) {
        		var expires_in = response.expires_in / 60;
          		var fixed = expires_in.toFixed(2);
          		$('#tokenBtn').text('token expiring in: ' + fixed + ' minutes, (check current token again)');
          		console.log("\ncheckToken() token clientID match, calculated expiration\n");
        	}
        	else {
        		// "I'm telling you baby, that's not  mine." - Austin "Danger" Powers
        		$('#tokenBtn').text('foreign token found, get new token');
        		console.log("\ncheckToken() foreign token found for clientID: " + response.audience + "\n");
        	}

        }
      });
}

function checkCurrentToken() {

  checkToken(app.token);

}

function sessionActive() {
  // http://adodson.com/hello.js/#helloapi
  var gl = hello( "google" ).getAuthResponse();
  var current_time = (new Date()).getTime() / 1000;
  return gl && gl.access_token && gl.expires > current_time;
}


function initHelloJS () {

	hello.on('auth.login', function(auth){

		console.log("\nauth.login event callback (begin)\n");

  		// this seems to be triggered BOTH by hello('google').login({scope: "email" }).then(
  		// AND by the discovery, on startup, of a previously existing token (valid or invalid)  <--- 'autologin' (see below)
  		//
  		// 

  	if (typeof auth != 'undefined') {

    	$('#loginBtn').text("hello.on('auth.login'): found token");
    	console.log("\nauth.login event callback, found token:\n" + JSON.stringify(auth) + "\n");

    	app.network = auth.network;

    	showLocalStorage();

    	app.token = auth.authResponse.access_token;
    	app.tokenExpires = auth.authResponse.expires;

    	checkToken(app.token);

  	}

  	else {
    	$('#loginBtn').text("hello.on('auth.login'): no token");
    	console.log("auth.login event callback, no token:\n" + JSON.stringify(auth));
  	}

  	console.log("\nauth.login event callback (end)\n");
  
	});


	hello.init(

		// "Autologin is triggered when client_ids are assigned to the services.""
		// https://github.com/MrSwitch/hello.js/issues/124

  		{ google   : app.clientID },
  		{ redirect_uri:'hello.html' }

	);

}
