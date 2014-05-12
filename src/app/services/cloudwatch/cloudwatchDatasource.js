define([
  'angular',
  'underscore',
  'kbn'
],
function (angular, _, kbn) {
  'use strict';

  var module = angular.module('kibana.services');

  module.factory('CloudwatchDatasource', function($q, $http) {

    function CloudwatchDatasource(datasource) {
      this.type = 'cloudwatch';
      this.editorSrc = 'app/partials/cloudwatch/editor.html';

      // From options
      this.urls = datasource.urls || 'URLS';
      this.username = datasource.username || 'USERNAME';
      this.password = datasource.password || 'PASSWORD';
      this.name = datasource.name;

      this.templateSettings = {
        interpolate : /\[\[([\s\S]+?)\]\]/g,
      };
    }

    // Called by get_data()
    CloudwatchDatasource.prototype.query = function(options) {
      console.log(options);

      var promises = _.map(options.targets, function(target) {
        var query;

        if (target.hide) {
          return [];
        }

        if (!(target.namespace && target.metricName && target.dimensions && target.statistics && target.units)) {
          return [];
        }

        var timeFilter = getTimeFilter(options);

        return this.doInfluxRequest(query, target.alias).then(handleInfluxQueryResponse);

      }, this);

      return $q.all(promises).then(function(results) {
        return { data: _.flatten(results) };
      });

    };

    CloudwatchDatasource.prototype.listSeries = function() {
      return this.doInfluxRequest('list series').then(function(data) {
        return _.map(data, function(series) {
          return series.name;
        });
      });
    };

    CloudwatchDatasource.prototype.listMetrics = function() {
      var deferred = $q.defer();

      var callback = function (err, data) {
        if (err !== null) {
          console.log(err);
          deferred.reject(err);
        } else {
          deferred.resolve(data.Metrics);
          console.log(data);
        }
      };

      window.cloudwatch.listMetrics({}, callback);

      return deferred.promise;
    };

    CloudwatchDatasource.prototype.doInfluxRequest = function(query, alias) {
      var _this = this;
      var deferred = $q.defer();

      retry(deferred, function() {
        var currentUrl = _this.urls.shift();
        _this.urls.push(currentUrl);

        var params = {
          u: _this.username,
          p: _this.password,
          time_precision: 's',
          q: query
        };

        var options = {
          method: 'GET',
          url:    currentUrl + '/series',
          params: params,
        };

        return $http(options).success(function (data) {
          data.alias = alias;
          deferred.resolve(data);
        });
      }, 10);

      return deferred.promise;
    };

    function handleInfluxQueryResponse(data) {
      var output = [];

      _.each(data, function(series) {
        var timeCol = series.columns.indexOf('time');

        _.each(series.columns, function(column, index) {
          if (column === "time" || column === "sequence_number") {
            return;
          }

          var target = data.alias || series.name + "." + column;
          var datapoints = [];

          for(var i = 0; i < series.points.length; i++) {
            datapoints[i] = [series.points[i][index], series.points[i][timeCol]];
          }

          output.push({ target:target, datapoints:datapoints });
        });
      });

      return output;
    }

    function getTimeFilter(options) {
      var from = getInfluxTime(options.range.from);
      var until = getInfluxTime(options.range.to);

      if (until === 'now()') {
        return 'time > now() - ' + from;
      }

      return 'time > ' + from + ' and time < ' + until;
    }

    function getInfluxTime(date) {
      if (_.isString(date)) {
        if (date === 'now') {
          return 'now()';
        }
        else if (date.indexOf('now') >= 0) {
          return date.substring(4);
        }

        date = kbn.parseDate(date);
      }

      return to_utc_epoch_seconds(date);
    }

    function to_utc_epoch_seconds(date) {
      return (date.getTime() / 1000).toFixed(0) + 's';
    }


    return CloudwatchDatasource;

  });

});
