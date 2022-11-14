<?php
 
session_start();
 
if(isset($_GET['logout'])){    
     
    //Simple exit message
    $logout_message = "<div class='msgln'><span class='left-info'>User <b class='user-name-left'>". $_SESSION['name'] ."</b> has left the chat session.</span><br></div>";
    file_put_contents("log.html", $logout_message, FILE_APPEND | LOCK_EX);
     
    session_destroy();
    header("Location: index.php"); //Redirect the user
}
 
if(isset($_POST['enter'])){
    if($_POST['name'] != ""){
        $_SESSION['name'] = stripslashes(htmlspecialchars($_POST['name']));
    }
    else{
        echo '<span class="error">Please type in a name</span>';
    }
}
 
function loginForm(){
    echo
    '<div id="loginform">
    <p>Please enter your name to continue!</p>
    <form action="index.php" method="post">
      <label for="name">Name &mdash;</label>
      <input type="text" name="name" id="name" />
      <input type="submit" name="enter" id="enter" value="Enter" />
    </form>
  </div>';
}
 
?>
 
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
 
        <title>Tuts+ Chat Application</title>
        <meta name="description" content="Tuts+ Chat Application" />
        <link rel="stylesheet" href="style.css" />
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport"
          content="width=device-width, height=device-height,user-scalable=no, initial-scale=1.0" />
    <link rel="stylesheet" href="default.css"/>
    </head>
    <body>
    <?php
    if(!isset($_SESSION['name'])){
        loginForm();
    }
    else {
    ?>
        <div id="wrapper">
            <div id="menu">
                <p class="welcome">Welcome, <b><?php echo $_SESSION['name']; ?></b></p>
                <p class="logout"><a id="exit" href="#">Exit Chat</a></p>
            </div>
 
            <div id="chatbox">
            <?php
            if(file_exists("log.html") && filesize("log.html") > 0){
                $contents = file_get_contents("log.html");          
                echo $contents;
            }
            ?>
            </div>
 
            <form name="message" action="">
                <input name="usermsg" type="text" id="usermsg" />
                <input name="submitmsg" type="submit" id="submitmsg" value="Send" />
            </form>
        </div>
        <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
        <script type="text/javascript">
            // jQuery Document
            $(document).ready(function () {
                $("#submitmsg").click(function () {
                    var clientmsg = $("#usermsg").val();
                    $.post("post.php", { text: clientmsg });
                    $("#usermsg").val("");
                    return false;
                });
 
                function loadLog() {
                    var oldscrollHeight = $("#chatbox")[0].scrollHeight - 20; //Scroll height before the request
 
                    $.ajax({
                        url: "log.html",
                        cache: false,
                        success: function (html) {
                            $("#chatbox").html(html); //Insert chat log into the #chatbox div
 
                            //Auto-scroll           
                            var newscrollHeight = $("#chatbox")[0].scrollHeight - 20; //Scroll height after the request
                            if(newscrollHeight > oldscrollHeight){
                                $("#chatbox").animate({ scrollTop: newscrollHeight }, 'normal'); //Autoscroll to bottom of div
                            }   
                        }
                    });
                }
 
                setInterval (loadLog, 2500);
 
                $("#exit").click(function () {
                    var exit = confirm("Are you sure you want to end the session?");
                    if (exit == true) {
                    window.location = "index.php?logout=true";
                    }
                });
            });
        </script>
        <div id="chat-room" style="display: none;">
      <video id="self-view" autoplay></video>
      <div id="remote-view-container">
        <video id="remote-view" autoplay></video>
        <div id="view-buttons">
          <button class="view-button" id="share-button">share?</button>
          <button class="view-button" style="display: none" id="stop-share-button"></button>
          <button class="view-button" id="share-file-button">share file</button>
        </div>
      </div>
    </div>
    <div id="start">
      <button id="start-button">Create</button>
      <hr/>
      <br/>
      <input id="offer_paste" placeholder="Offer" />
      <button id="Answer">Answer</button>
      <hr/>
      <a href="https://github.com/earthchange/gog">Sources</a>
      <hr/>
      Press F12 to see the 'console'.
    </div>

    <div id="select-file-dialog" style="display: none;">
      <div id="dialog-content">
        <div id="select-file">
          <div id="label">Select a file:</div>
          <input type="file" id="select-file-input"/>
        </div>
        <div id="dialog-footer">
          <button id="ok-button">Ok</button>
          <button id="cancel-button" class="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
    <!-- <div id="installPWA">Install PWA</div> -->
    <!-- <script src="./pwa-handler.js"></script> -->
    <script src="./adapter.js"></script>
    <script src="./main.js"></script>
    </body>
</html>
<?php
}
?>