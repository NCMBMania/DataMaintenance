var application_key = "APPLICATION_KEY";
var client_key = "CLIENT_KEY";
var ncmb = new NCMB(application_key, client_key);
var vm;

var manageRole;

roles = {};
var ary = ['Administrator', 'Manager'];
for (i in ary) {
  ncmb.Role.equalTo("roleName", ary[i])
    .fetch()
    .then(function(role) {
      roles[ary[i]] = role;
    });
}

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
  
  ncmb.Role.equalTo("roleName", 'Administrator')
    .fetch()
    .then(function(role) {
      roles['Administrator'] = role;
      ncmb.User.isBelongTo(roles['Administrator'])
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
        });
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
      roles['Manager']
        .addUser(user)
        .update()
        .then(function (role){
          $("#createManagerForm")[0].reset();
          showMessage('success', 'アカウントを追加しました');
        });
    });
  });
  
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
  
  $(".dataManage").on('click', function(e) {
    e.preventDefault();
    $('.page').addClass('hide');
    $('.dataManagement').removeClass('hide');
    if (typeof vm == 'object') {
      return;
    }
    var className = $(e.target).data('classname')
    var ClassData = ncmb.DataStore(className);
    ClassData.fetchAll()
      .then(function(results) {
        if (Object.keys(results).length == 0) {
          var data = {
            header: ['objectId'],
            body: []
          }
        } else {
          var data = {
            header: [],
            body: results
          };
          for (var i in results) {
            data.header = data.header.concat(Object.keys(results[i]));
          }
          data.header = data.header.filter(function(value, index, self) {
            return self.indexOf(value) == index;
          });
        }
        var id = 1;
        vm = new Vue({
          el: '#maintenance',
          data: {
            data: data,
            className: className
          },
          methods: {
            add_row: function() {
              var item = new ClassData({_id: id});
              var acl = new ncmb.Acl;
              acl.setRoleReadAccess(roles['Manager'], true);
              acl.setRoleWriteAccess(roles['Manager'], true);
              acl.setPublicReadAccess(true);
              item.set('acl', acl);
              this.data.body.push(item);
              id++;
            },
            add_cloumn: function() {
              var columnName = prompt("カラム名を入力してください");
              this.data.header.push(columnName);
            },
            delete_row: function(row) {
              var me = this;
              if (typeof row.objectId == 'undefined') {
                this.data.body = this.data.body.filter(function(data) {
                  return data._id != row._id;
                });
                showMessage('success', '削除しました');
              } else {
                row.delete()
                  .then(function() {
                    me.data.body = me.data.body.filter(function(data) {
                      return data.objectId != row.objectId;
                    });
                    showMessage('success', '削除しました');
                  })
              }
            },
            done_edit: function(row) {
              var me = this;
              if (typeof row.objectId == 'undefined') {
                delete row['_id'];
                row.save()
                  .then(function(obj) {
                    showMessage('success', '作成しました');
                    vm.$forceUpdate();
                  });
              } else {
                row.update()
                  .then(function(obj) {
                    showMessage('success', '更新しました');
                    vm.$forceUpdate();
                  })
              }
              
            }
          }
        })
      })
  });
  
  checkRole();
});
