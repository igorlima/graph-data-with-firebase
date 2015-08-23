define(['jquery', 'backbone'], function($, Backbone) {
  var Channel, firebaseRef, vertexRef, edgeRef;
  // vertexRef. orderByKey().equalTo('-JxQM_fQTywKZtwOs90V').limitToFirst(1).once('value', function(data){debugger})
  // Object.keys( data.val() )[0]

  Channel = $.extend( {}, Backbone.Events );
  ref       = new Firebase("https://graph-data.firebaseio.com");
  vertexRef = ref.child('vertex');
  edgeRef   = ref.child('edge');

  Channel.on('disconnect', function() {
    console.warn('disconnected');
  });

  Channel.on('retrieve-all-nodes', function() {
    vertexRef.on('child_added', function(data) {

      var isPlainObject = $.isPlainObject( data.val() );
      if ( !isPlainObject ) {
        vertexRef.child( data.key() ).remove();
        return;
      }

      Channel.trigger( 'node-added', {
        id: data.key(),
        label: data.val().label,
        color: data.val().color
      } );
    });

    vertexRef.on('child_changed', function(data) {
      Channel.trigger( 'node-edited', {
        id: data.key(),
        label: data.val().label,
        color: data.val().color
      } );
    });

    vertexRef.on('child_removed', function(data) {
      Channel.trigger( 'node-removed', {
        id: data.key()
      } );
    });

    edgeRef.on('child_added', function(data) {
      var link = data.val(),
          isPlainObject = $.isPlainObject( link );

      if ( !isPlainObject || !link.source || !link.target || !link.source.id || !link.target.id ) {
        vertexRef.child( data.key() ).remove();
        return;
      }

      Channel.trigger( 'link-added', {
        id: data.key(),
        source: {
          id: data.val().source.id,
        },
        target: {
          id: data.val().target.id
        }
      } );
    });

    edgeRef.on('child_removed', function(data) {
      var link = data.val(),
          isPlainObject = $.isPlainObject( link );

      if ( !isPlainObject || !link.source || !link.target || !link.source.id || !link.target.id ) {
        return;
      }

      Channel.trigger( 'link-removed', {
        id: data.key(),
        source: {
          id: data.val().source.id,
        },
        target: {
          id: data.val().target.id
        }
      } );
    });

  });

  Channel.on('add-node', function( node, cb ) {
    var vertex = vertexRef.push({
      label: node.label || '',
      color: node.color || ''
    }, function() {
      if (cb) {
        node.id = vertex.key();
        cb(node);
      }
    });
  });

  Channel.on('edit-node', function(node) {
    if (node && node.id) {
      vertexRef.child(node.id).update({
        label: node.label || '',
        color: node.color || ''
      });
    }
  } );

  Channel.on('remove-node', function(node) {
    if (node && node.id) {
      vertexRef.child(node.id).remove();
    }
  });

  Channel.on('add-link', function(link) {
    if (!link || !link.source || !link.target || !link.source.id || !link.target.id) return;

    var edge = edgeRef.push({
      source: {
        id: link.source.id
      },
      target: {
        id: link.target.id
      }
    }, function() {
      link.id = edge.key();
      Channel.trigger( 'link-added', link );
    });

  });

  Channel.on('remove-link', function(link) {
    if (link && link.id) {
      edgeRef.child(link.id).remove(function() {
        Channel.trigger( 'link-removed', link );
      });
    }
  });

  return Channel;
});

