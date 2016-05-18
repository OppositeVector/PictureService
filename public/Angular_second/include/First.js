var app = angular.module('firstApp',[]);

app.controller('firstController', function ($scope) {
  $scope.first = 'first name';
  $scope.last = 'last name';
  $scope.heading = "The massage: ";

  $scope.updateMsg = function () {
    $scope.msg = "Hello, "+ $scope.first + " " + $scope.last;
  };
});