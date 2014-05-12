define([
  'angular'
],
function (angular) {
  'use strict';

  var module = angular.module('kibana.controllers');

  module.controller('CloudwatchTargetCtrl', function($scope, $timeout) {

    $scope.init = function() {

      $scope.statistics = ['Minimum', 'Maximum', 'Sum', 'Average', 'SampleCount'];
      $scope.units = ['Seconds', 'Bytes', 'Bits', 'Percent', 'Count', 'Bytes/Second', 'Bits/Second', 'Count/Second', 'None'];

      if (!$scope.target.namespace) {
        $scope.target.namespace = null;
      }

      if (!$scope.target.metricName) {
        $scope.target.metricName = null;
      }

      if (!$scope.target.statistic) {
        $scope.target.statistic = null;
      }

      if (!$scope.target.dimensions) {
        $scope.target.dimensions = null;
      }

      $scope.oldTarget = angular.copy($scope.target);

      // $scope.$on('typeahead-updated', function(){
      //   $timeout($scope.get_data);
      // });
    };

    $scope.inputChanged = function() {
      if (!angular.equals($scope.oldTarget, $scope.target)) {
        $scope.oldTarget = angular.copy($scope.target);
        console.log('input changed');
        console.log($scope.target);
        $scope.get_data();
      }
    };

    $scope.duplicate = function() {
      var clone = angular.copy($scope.target);
      $scope.panel.targets.push(clone);
    };

  });

});
