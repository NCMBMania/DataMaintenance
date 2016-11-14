var application_key = "d4c65ea8581688b1e303d14db32005447d38e8864a764794b99d29613e269dca";
var client_key = "8915ea8e1d4f7fe24228df8b84e34e0b4d6ccea3b9513423d54f0b86379bc8a0";
var ncmb = new NCMB(application_key, client_key);

// ユーザが指定したロールに所属しているかチェックします
ncmb.User.isBelongTo = function(role) {
  me = ncmb.User.getCurrentUser();
  return new Promise(function(res, rej) {
    ncmb.request({
      path: "/"+ncmb.version+"/users", 
      query: {
        where: JSON.stringify({
          "objectId": me.objectId,
          "$relatedTo":{
            "object":{
              "__type":"Pointer",
              "className":"role",
              "objectId": role.objectId
            },
            "key":"belongUser"
          }
        })
      }
    })
      .then(function(ary) {
        var json = JSON.parse(ary).results;
        res(json.length == 1);
      })
      .catch(function(e) {
        rej(e);
      });
  })
}

// メニューの表示を変更します
var changeMenu = function(type) {
  switch (type) {
  case "login":
  case "logout":
    $(".login-required").hide();
    $(".no-login").show();
    break;
  case "admin":
    $(".admin-required").show();
    $(".login-required").show();
    $(".no-login").hide();
    break;
  case "manager":
    $(".login-required").show();
    $(".admin-required").hide();
    $(".no-login").hide();
  }
};

var checkRole = function() {
  if (!ncmb.User.getCurrentUser()) {
    changeMenu("login");
    return;
  }
  ncmb.Role.equalTo("roleName", "Administrator")
    .fetch()
    .then(function (role){
      ncmb.User.isBelongTo(role)
    .then(function(result) {
        if (result) {
          changeMenu("admin");
          console.log("所属しています")
        }else{
          changeMenu("manager");
          console.log("所属していません")
        }
      }, function(err) {
        console.log("エラー", err);
      })
    });
};

var showMessage = function(className, message) {
  $("#alert").addClass("alert-" + className).text(message);
  $("#alert").removeClass("hide");
  setTimeout(function() {
    $("#alert").addClass("hide");
  }, 3000)
};

$(function() {
  $("#loginForm").on("submit", function(e) {
    e.preventDefault();
    var userName = $(this).find("[name='userName']").val();
    var password = $(this).find("[name='password']").val();
    ncmb.User.login(userName, password)
      .then(function(user) {
        $(".page").addClass('hide');
        checkRole();
      })
      .catch(function(err) {
        showMessage('danger', 'ログインに失敗しました');
      })
  });
  
  $("#login").on("click", function(e) {
    e.preventDefault();
    $(".page").addClass('hide');
    $(".login").removeClass('hide');
  });
  
  $("#createManagerForm").on("submit", function(e) {
    e.preventDefault();
    var userName = $(this).find("[name='userName']").val();
    var password = $(this).find("[name='password']").val();
    var user = new ncmb.User({
      userName: userName,
      password: password
    });
    
    user.signUpByAccount().then(function(user){
      ncmb.Role.equalTo("roleName", "Manager")
        .fetch()
        .then(function (role){
          role
            .addUser(user)
            .update()
        })
        .then(function (role){
          $("#createManagerForm")[0].reset();
          showMessage('success', 'アカウントを追加しました');
        });
    });
    
  })
  
  $("#logout").on("click", function(e) {
    e.preventDefault();
    ncmb.User.logout()
      .then(function() {
        changeMenu("login");
      })
      .catch(function(err) {
        localStorage.removeItem("NCMB/"+ncmb.apikey+"/currentUser")
        changeMenu("login");
      })
  });
  
  $("#createManager").on('click', function(e) {
    e.preventDefault();
    $(".page").addClass('hide');
    $(".createManager").removeClass('hide');
  })
  
  checkRole();
});
