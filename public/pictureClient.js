var app = angular.module("pictureApp", []);

var model = { file: null, pics: [] };
var refreshWait = 5000;
var timeoutId = null;
var http;

function OnFocus() {
    if(timeoutId == null) {
        timeoutId = setTimeout(Refresh, refreshWait);
    }
}

function OnBlur() {
    if(timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}

window.addEventListener("focus", OnFocus, false);
window.addEventListener("blur", OnBlur, false);

function Refresh() {

    timeoutId = setTimeout(Refresh, refreshWait);

    http.get('pictures').success(function(ids) {
        if(ids.result == 1) {
            model.pics = [];
            for(var i = 0; i < ids.data.length; ++i) {
                model.pics.push(ids.data[i]);
            }
        } else {
            console.log(ids.data);
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
    Refresh($http);
    $scope.DeleteFile = function(id) {
        console.log("Deleteing " + id);
        $http.get("/deletefile/" + id).success(function(data) {
            Refresh($http);
            console.log(data);
        });
    }
});

app.controller("UploadController", ['$http', '$scope', 'fileUpload', function($http, $scope, fileUpload){
    $scope.model = model;
    http = $http;
    $scope.UploadFile = function() {
        console.log($scope.model.file);
        if($scope.model.file && $scope.model.author && $scope.model.title) {
            if(($scope.model.author.trim().length > 0) && ($scope.model.title.trim().length > 0)) {
                fileUpload.uploadFileToUrl($scope.model, "/file", function() {
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
    Refresh();
}]);

function NoInfo() {
    alert("You didnt enter a file, or an author or a title to the boxes !");
}

