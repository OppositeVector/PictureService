var app = angular.module("pictureApp", []);

var model = { file: null, pics: [], replace: null };
var refreshWait = 5000;
var timeoutId = null;
var http;
var focused = true;

function OnFocus() {
    focused = true;
    oRefresh();
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

var maxStringLenth = 27;

function Refresh() {

    http.get('/pictures').success(function(response, status, headers, config) {
        if(status == 200) {
            if(response.result == 1) {
                model.pics = [];
                for(var i = 0; i < response.data.length; ++i) {
                    var pic = response.data[i];
                    if(pic.title.length > maxStringLenth) {
                        pic.title = pic.title.substr(0, maxStringLenth - 3) + '...';
                    }
                    if(pic.author.length > maxStringLenth) {
                        pic.author = pic.author.substr(0, maxStringLenth - 3) + '...';
                    }
                    model.pics.push(pic);
                }
            } else {
                console.log(response.data);
            }
        }
        // if(focused == true) {
        //     timeoutId = setTimeout(Refresh, refreshWait);
        // } else {
        //     timeoutId = null;
        // }
        
    }).error(function(err, status, headers, config) {
        if(focused == true) {
            timeoutId = setTimeout(Refresh, refreshWait);
        } else {
            timeoutId = null;
        }
    });

}

function oRefresh() {
    if(timeoutId != null) {
        cleartimeout(timeoutId);
        Refresh();
    }
}

function ClearInput() {
    angular.forEach(angular.element("input"), function(inputElem) {
        angular.element(inputElem).val(null);
    });
}

function DirtyReplace(callback) {

    var fd = new FormData();
    fd.append('image', model.replace);
    http.put('/pictures/' + model.replaceId, fd, {
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

app.service('fileReplace', ['$http', function ($http) {
    this.uploadFileToUrl = function(data, uploadUrl, callback) {
        var fd = new FormData();
        fd.append('image', data.file);
        $http.put(uploadUrl, fd, {
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

app.directive('fileModelImidiate', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var iModel = $parse(attrs.fileModelImidiate);
            var modelSetter = iModel.assign;
            
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                    console.log(model.replace);
                    DirtyReplace(function() {
                        setTimeout(function() {
                            oRefresh();
                        }, 2000);
                    });
                });
            });
        }
    };
}]);

app.directive('styleParent', function(){ 
    return {
        restrict: 'A',
        link: function(scope, elem, attr) {
            elem.on('load', function() {

                var w = $(this).width();
                var h = $(this).height();

                var left = (150 - w) / 2;
                var top = (150 - h) / 2;
                elem.css({ 'margin-left': left.toString() + 'px', 'margin-top': top.toString() + 'px' });
                elem.toggleClass('hide');

            });
        }
    };
});

var images = [];
app.controller("ThumbnailController", function($http, $scope){
    $scope.data = images;
    $scope.model = model;
    http = $http;
    $scope.DeleteFile = function(id) {
        console.log("Deleteing " + id);
        $http.delete("/pictures/" + id).success(function(response, status, headers, config) {
            oRefresh();
            console.log(response);
        }).error(function(err, status, headers, config) {
            console.log(err);
        });
    }
    $scope.SetId = function(id) {
        model.replaceId = id;
        console.log(id);
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
                        oRefresh();
                        ClearInput();
                    }, 2000);
                });
            } else {
                NoInfo();
            }
        } else {
            NoInfo();
        }
    }
    ClearInput();
    oRefresh();
}]);

function NoInfo() {
    alert("You didnt enter a file, or an author or a title to the boxes !");
}

