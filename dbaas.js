define(['jquery', 'backbone'], function($, Backbone) {
  var Channel, firebaseRef, vertexRef, edgeRef;
  // vertexRef. orderByKey().equalTo('-JxQM_fQTywKZtwOs90V').limitToFirst(1).once('value', function(data){debugger})
  // Object.keys( data.val() )[0]

  Channel = $.extend( {}, Backbone.Events );
  ref       = new Firebase("https://graph-data.firebaseio.com");
  vertexRef = ref.child('vertex');
  edgeRef   = ref.child('edge');

  function removeEdgeIfVertexNotExist(edgeId, vertexId) {
    vertexRef
      .orderByKey()
      .equalTo( vertexId )
      .limitToFirst(1)
      .once('value', function(data) {
        !data.val() && edgeRef.child( edgeId ).remove();
      } );
  }

  function removeEdgeIfNecessary(edgeId, edge) {
    removeEdgeIfVertexNotExist(edgeId, edge.sourceId);
    removeEdgeIfVertexNotExist(edgeId, edge.targetId);
  }

  function removeAllEdgesConnectedTo(vertexId) {
    [ "sourceId", "targetId" ].forEach( function( variable ) {
      edgeRef
        .orderByChild( variable )
        .equalTo( vertexId )
        .once('value', function( data ) {
          data.val() && Object.keys( data.val() ).forEach( function( edgeId ){
            edgeRef.child( edgeId ).remove();
          } )
        });
    } );
  }

  Channel.on('disconnect', function() {
    console.warn('disconnected');
  });

  Channel.on('remove-all-nodes', function() {
    ref.set( {} );
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

      removeAllEdgesConnectedTo( data.key() );
    });

    edgeRef.on('child_added', function(data) {
      var link = data.val(),
          isPlainObject = $.isPlainObject( link );

      if ( !isPlainObject || !link.sourceId || !link.targetId ) {
        edgeRef.child( data.key() ).remove();
        return;
      }

      Channel.trigger( 'link-added', {
        id: data.key(),
        source: {
          id: link.sourceId
        },
        target: {
          id: link.targetId
        }
      } );

      removeEdgeIfNecessary( data.key(), link );
    });

    edgeRef.on('child_removed', function(data) {
      var link = data.val(),
          isPlainObject = $.isPlainObject( link );

      if ( !isPlainObject || !link.sourceId || !link.targetId ) {
        return;
      }

      Channel.trigger( 'link-removed', {
        id: data.key(),
        sourceId: data.val().sourceId,
        targetId: data.val().targetId
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
    if ( node && node.id ) {
      vertexRef.child(node.id).remove();
    }
  });

  Channel.on('add-link', function(link) {
    if (!link || !link.source || !link.target || !link.source.id || !link.target.id) return;

    var edge = edgeRef.push({
      sourceId: link.source.id,
      targetId: link.target.id
    }, function() {
      link.id = edge.key();
      Channel.trigger( 'link-added', link );
    });

  });

  Channel.on('remove-link', function(link) {
    if ( link && link.id ) {
      edgeRef.child(link.id).remove(function() {
        Channel.trigger( 'link-removed', link );
      });
    }
  });

  return Channel;
});
