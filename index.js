// dependencies
var AWS = require('aws-sdk');
var _ = require('underscore');
var _l = require('lodash');
var when = require('when');
var moment = require('moment');
var rest = require('restler');

exports.handler = function(event, context) {

  console.log('event');
  console.log(event);

  var all_done = when.promise(function(all_done_resolve, all_done_reject, all_done_notify) {

    var total_pages = 9999;
    var sics = [];
    var max_pages = 99999;

    if (!_.isUndefined(event.max_pages)) {
      max_pages = event.max_pages;
    }

    when.iterate(function(next_page){
      return next_page + 10;
    },
    function(page){
      return page >= total_pages || page > max_pages;
    }, function(page) {
      return when.promise(function(resolve, reject, notify){

        var get_sics = function(page) {
          return when.promise(function(resolve, reject, notify){
            var search_body = _.extend(event.search_body, {page: page, select: "sic"});
            rest.put(event.search_url, {
              data: JSON.stringify(search_body),
            }).on('success', function(data, response){
              if (data.length > 0) {
                _.each(data, function(stock){
                  sics.push(stock.sic);
                });
              }
              console.log('Got page: ' + page);
              console.log('Total Rics: ' + sics.length);
              total_pages = parseInt(response.headers['x-api-pages']);
              resolve();
            }).on('fail', function(data, response){
              console.log('Error:', data);
              reject(data);
            });
          });
        };

        // Kick off 10 page fetches
        var promises = _.map(_.range(page, page + 10), function(page){
          return get_sics(page);
        });

        // When all fetches are done then let the loop continue
        when.all(promises).done(function(){
          resolve();
        }, function(reason){
          reject(reason);
        });

      });
    },
    1)
    .done(function(){
      // Got all the sics, now set up the observes in chunks of 10
      var chunks = _l.chunk(sics, 10000);

      when.iterate(function(index){
        return index + 1;
      },
      function(index){
        return index > (chunks.length - 1);
      },
      function(index){
        return when.promise(function(resolve, reject, notify){
          var chunk = chunks[index];

          var promises = _.map(chunk, function(sic){
            return when.promise(function(resolve, reject, notify){
              var params = {
                identity: event.identity,
                sic: sic,
                language: 'en'
              };
              rest.postJson(event.search_url, params)
              .on('success', function(data, response){
                console.log('data');
                console.log(data);
                resolve();
              })
              .on('fail', function(data, response){
                console.log('Error saving sic to alerts');
                console.log(data, response);
                reject('Error saving sic to alerts');
              });
            });
          }, this);

          // When all posts are done then let the loop continue
          when.all(promises).done(function(){
            resolve();
          }, function(reason){
            reject(reason);
          });
        });
      },
      0).done(function(){
        all_done_resolve();
      }, function(err){
        all_done_reject(err);
      });
    }, function(reason){
      all_done_reject(reason);
    });

  }).done(function(){
    console.log("Successfully observed stocks");
    context.succeed("Successfully observed stocks");
  }, function(reason){
    console.log("Failed to observe stocks: " + reason);
    context.fail("Failed to observe stocks: " + reason);
  });

};
