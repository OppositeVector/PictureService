var app = angular.module("pictureApp", []);

var model = { file: null, pics: [] };
var refreshWait = 5000;
var timeoutId = null;
var http;
var focused = true;

function OnFocus() {
    focused = true;
    if(timeoutId == null) {
        Refresh();
    }
    console.log("Focus");
}

function OnBlur() {
    focused = false;
    console.log("Blur");
}

window.onblur = OnBlur;
window.onfocus = OnFocus;
// window.addEventListener("focus", OnFocus, false);
// window.addEventListener("blur", OnBlur, false);

function Refresh() {

    http.get('/pictures').success(function(response, status, headers, config) {
        if(status == 200) {
            if(response.result == 1) {
                model.pics = [];
                for(var i = 0; i < response.data.length; ++i) {
                    model.pics.push(response.data[i]);
                }
            } else {
                console.log(response.data);
            }
        }
        if(focused == true) {
            timeoutId = setTimeout(Refresh, refreshWait);
        } else {
            timeoutId = null;
        }
        
    }).error(function(err, status, headers, config) {
        if(focused == true) {
            timeoutId = setTimeout(Refresh, refreshWait);
        } else {
            timeoutId = null;
        }
    });

}

function ClearInput() {
    angular.forEach(angular.element("input"), function(inputElem) {
        angular.element(inputElem).val(null);
    });
}

app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);

app.service('fileUpload', ['$http', function ($http) {
    this.uploadFileToUrl = function(data, uploadUrl, callback) {
        var fd = new FormData();
        fd.append('image', data.file);
        fd.append('title', data.title);
        fd.append('author', data.author);
        $http.post(uploadUrl, fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined }
        }).success(function(response, status, headers, config) {
            console.log(response);
            console.log(headers);
            if(callback != null) {
                callback();
            }
        }).error(function(err, status, headers, config) {
            console.log("Error uploading a file " + err);
            if(callback != null) {
                callback();
            }
        });
    }
}]);

var images = [];
app.controller("ThumbnailController", function($http, $scope){
    $scope.data = images;
    $scope.model = model;
    http = $http;
    $scope.DeleteFile = function(id) {
        console.log("Deleteing " + id);
        $http.delete("/pictures/" + id).success(function(response, status, headers, config) {
            Refresh($http);
            console.log(response);
        }).error(function(err, status, headers, config) {
            console.log(err);
        });
    }
    Refresh();
});

app.controller("UploadController", ['$http', '$scope', 'fileUpload', function($http, $scope, fileUpload){
    $scope.model = model;
    $scope.UploadFile = function() {
        console.log($scope.model.file);
        if($scope.model.file && $scope.model.author && $scope.model.title) {
            if(($scope.model.author.trim().length > 0) && ($scope.model.title.trim().length > 0)) {
                fileUpload.uploadFileToUrl($scope.model, "/pictures", function() {
                    setTimeout(function() {
                        ClearInput();
                        Refresh($http);
                    }, 2000)
                });
            } else {
                NoInfo();
            }
        } else {
            NoInfo();
        }
    }
    ClearInput();
}]);

function NoInfo() {
    alert("You didnt enter a file, or an author or a title to the boxes !");
}

