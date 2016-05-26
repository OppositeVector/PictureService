var app = angular.module("pictureApp", []);

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
app.controller("UploadController", function($http,$scope){
   $scope.imageUpload = function(element){
        var reader = new FileReader();
        reader.onload = ImageLoaded;
        reader.readAsDataURL(element.files[0]);
    } 
    function ImageLoaded(e) {
        images.push({url:e.target.result});
        console.log(images.length);
    }
    $scope.name = "Victor";

    $scope.TestButton = function() {
        $scope.name = "Niv";
        $http.get("http://picservice11api-1243909407.eu-central-1.elb.amazonaws.com/Files").success(function(data){
            console.log(data);
        });
    }
});

