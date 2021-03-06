/*
 * vim: ts=4:sw=4:expandtab
 */
(function () {
  'use strict';

  var FileView = Backbone.View.extend({
      tagName: 'a',
      initialize: function(dataUrl) {
          this.dataUrl = dataUrl;
          this.$el.text(i18n('unsupportedAttachment'));
      },
      events: {
          'click': 'open'
      },
      open: function (e) {
          e.preventDefault();
          window.open(this.dataUrl, '_blank');
      },
      render: function() {
        this.$el.attr('href', this.dataUrl);
        this.trigger('update');
        return this;
      }
  });

  var ImageView = Backbone.View.extend({
      tagName: 'img',
      initialize: function(dataUrl) {
          this.dataUrl = dataUrl;
      },
      events: {
          'load': 'update',
      },
      update: function() {
        this.trigger('update');
      },
      render: function() {
        this.$el.attr('src', this.dataUrl);
        return this;
      }
  });

  var MediaView = Backbone.View.extend({
      initialize: function(dataUrl, contentType) {
          this.dataUrl = dataUrl;
          this.contentType = contentType;
          this.$el.attr('controls', '');
      },
      events: {
          'canplay': 'canplay'
      },
      canplay: function() {
          this.trigger('update');
      },
      render: function() {
          var $el = $('<source>');
          $el.attr('src', this.dataUrl);
          $el.attr('type', this.contentType);
          this.$el.append($el);
          return this;
      }
  });

  var AudioView = MediaView.extend({ tagName: 'audio' });
  var VideoView = MediaView.extend({ tagName: 'video' });

  Whisper.AttachmentView = Backbone.View.extend({
    tagName: 'span',
    className: 'attachment',
    initialize: function() {
        this.blob = new Blob([this.model.data], {type: this.model.contentType});

        var parts = this.model.contentType.split('/');
        this.contentType = parts[0];
        this.fileType = parts[1];
    },
    events: {
        'click': 'onclick'
    },
    onclick: function(e) {
        if (this.contentType === 'image') {
            var view = new Whisper.LightboxView({
                model: {
                    url      : this.objectUrl,
                    blob     : this.blob,
                    fileType : this.fileType
                }
            });
            view.render();
            view.$el.appendTo(this.el);
            view.$el.trigger('show');
        }
    },
    render: function() {
        var View;
        switch(this.contentType) {
            case 'image': View = ImageView; break;
            case 'audio': View = AudioView; break;
            case 'video': View = VideoView; break;
            default     : View = FileView; break;
        }
        if (!this.objectUrl) {
            this.objectUrl = window.URL.createObjectURL(this.blob);
        }
        var view = new View(this.objectUrl, this.model.contentType);
        view.$el.appendTo(this.$el);
        view.on('update', this.trigger.bind(this, 'update'));
        view.render();
        return this;
    }
  });

  Whisper.LightboxView = Whisper.View.extend({
      templateName: 'lightbox',
      className: 'modal lightbox',
      events: {
          'click .save': 'save',
          'click .close': 'remove',
          'click': 'onclick'
      },
      save: function(e) {
            var suggestedName;
            if (this.model.fileType) {
                suggestedName = 'signal.' + this.model.fileType;
            }
            var w = extension.windows.getViews()[0];
            if (w && w.chrome && w.chrome.fileSystem) {
                w.chrome.fileSystem.chooseEntry({
                    type: 'saveFile', suggestedName: suggestedName
                }, function(entry) {
                    if (!entry) {
                        return;
                    }
                    entry.createWriter(function(fileWriter) {
                        fileWriter.write(this.model.blob);
                    }.bind(this));
                }.bind(this));
            } else {
                console.log('Failed to get window');
            }
      },
      onclick: function(e) {
          var $el = this.$(e.target);
          if (!$el.hasClass('image') && !$el.closest('.controls').length ) {
              e.preventDefault();
              this.remove();
              return false;
          }
      },
      render_attributes: function() {
          return { url: this.model.url };
      }
  });

})();
