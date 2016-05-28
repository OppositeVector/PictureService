var app = angular.module("pictureApp", []);

var model = { file: null }



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
    this.uploadFileToUrl = function(file, uploadUrl, callback) {
        var fd = new FormData();
        fd.append('image', file);
        fd.append('title', 'something');
        fd.append('author', 'someone');
        $http.put(uploadUrl, fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined }
        }).success(function(response, status, headers, config) {
            console.log(response);
            console.log(headers);
        }).error(function(err, status, headers, config) {
            console.log("Error uploading a file " + err);
        });
    }
}]);

var images = [];
app.controller("ThumbnailController", function($http,$scope){
    $scope.data = images;
    /*$http.get('ytdata.json').success(function(ytdata) {
                $scope.data = ytdata;
    });*/
    $scope.imageUpload = function(element){
        var reader = new FileReader();
        reader.onload = ImageLoaded;
        reader.readAsDataURL(element.files[0]);
    } 
    function ImageLoaded(e) {
        $scope.$apply(function () {
            $scope.data.push({url:e.target.result});
            console.log(images.length);
        });
        
    }
});
app.controller("UploadController", ['$http', '$scope', 'fileUpload', function($http, $scope, fileUpload){
    $scope.model = model;
    $scope.UploadFile = function() {
        console.log($scope.model.file);
        fileUpload.uploadFileToUrl($scope.model.file, "/file");
    }
    // $scope.imageUpload = function(element){

    //     fileUpload.uploadFileToUrl(file, uploadUrl);
    //     var reader = new FileReader();
    //     reader.onload = ImageLoaded;
    //     reader.readAsDataURL(element.files[0]);
    // } 
    // function ImageLoaded(e) {
    //     images.push({url:e.target.result});
    //     $http.put()
    //     console.log(images.length);
    // }
    // $scope.name = "Victor";

    // $scope.TestButton = function() {
    //     $scope.name = "Niv";
    //     $http.get("http://picservice11api-1243909407.eu-central-1.elb.amazonaws.com/Files").success(function(data){
    //         console.log(data);
    //     });
    // }
}]);

