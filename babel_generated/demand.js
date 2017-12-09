'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (ctx) {
  var DemandJS = function () {
    _createClass(DemandJS, [{
      key: 'observeMutation',
      value: function observeMutation(mutations) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = mutations[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var mutation = _step.value;

            if (mutation.type !== 'childList') {
              continue;
            }
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = mutation.addedNodes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var added = _step2.value;

                if (this.isTargetMatch(added)) {
                  this.observeTarget(added);
                }
              }
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    }, {
      key: 'observeIntersection',
      value: function observeIntersection(intersections) {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = intersections[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var intersect = _step3.value;

            if (!intersect.isIntersecting) {
              continue;
            }
            var reg = this.phRegistry.get(intersect.target);
            if (reg === undefined || reg.loading) {
              continue;
            }
            reg.loading = true;
            this.beginLoad(reg);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }
    }, {
      key: 'beginLoad',
      value: function beginLoad(target) {
        var _this = this;

        var _resolveTarget = this.resolveTarget(target),
            target = _resolveTarget.target,
            registration = _resolveTarget.registration;

        if (registration.extraData.shouldInjectHtml) {
          var url = registration.extraData.href;
          this.options.onLoadBegin(target);
          fetch(url).then(function (response) {
            if (!response.ok) {
              throw Error(response.status + '_' + response.statusText);
            }
            return response.text();
          }).then(function (txt) {
            _this.injectLink(registration.target, txt);
          }).catch(function (ex) {
            _this.onLoadError(registration, ex);
          });
        } else if (registration.extraData.shouldRestore) {
          // setTimeout helps keep loading animations smooth
          setTimeout(function () {
            return _this.restoreTarget(registration);
          }, 0);
        } else {
          throw 'Unknown load operation';
        }
      }
    }, {
      key: 'isLoaded',
      value: function isLoaded(target) {
        return target.complete || false;
      }
    }, {
      key: 'injectLink',
      value: function injectLink(target, txt) {
        var reg = this.phRegistry.get(target);
        this.injectHtml(target, txt);
        this.onLoadComplete(reg);
      }
    }, {
      key: 'injectScript',
      value: function injectScript(target, id, code) {
        var oldDw = document.write;
        var content = '';
        document.write = function (c) {
          return content += c;
        };

        var codeToExecute = new Function(code + "\n" + '//@ sourceURL=' + id);
        codeToExecute();

        if (content !== '') {
          this.injectHtml(target, '<body>' + content + '</body>');
        }

        document.write = oldDw;
      }
    }, {
      key: 'injectHtml',
      value: function injectHtml(target, txt) {
        var _this2 = this;

        var root = document.createElement('html');
        root.innerHTML = txt;
        var bodies = root.getElementsByTagName('body');
        var scriptId = 1;
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = bodies[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var body = _step4.value;
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
              for (var _iterator5 = body.children[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                var bc = _step5.value;

                if ('tagName' in bc && bc.tagName.match(/script/i)) {
                  (function () {
                    var localScriptId = scriptId;
                    scriptId += 1;
                    var codePromise = Promise.resolve(bc.innerHTML);
                    if ('src' in bc && !!bc.src) {
                      codePromise = fetch(bc.src).then(function (response) {
                        if (!response.ok) {
                          throw Error(response.status + '_' + response.statusText);
                        }
                        return response.text();
                      });
                    }
                    codePromise.then(function (code) {
                      _this2.injectScript(target, target.href + '.inline[' + localScriptId + '].js', code);
                    });
                  })();
                } else {
                  target.parentNode.insertBefore(bc, target);
                }
              }
            } catch (err) {
              _didIteratorError5 = true;
              _iteratorError5 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                  _iterator5.return();
                }
              } finally {
                if (_didIteratorError5) {
                  throw _iteratorError5;
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }
      }
    }, {
      key: 'onLoadComplete',
      value: function onLoadComplete(target) {
        var _resolveTarget2 = this.resolveTarget(target),
            target = _resolveTarget2.target,
            registration = _resolveTarget2.registration;

        var first = this.options.shouldInsertOnLoad(registration.target);
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
          for (var _iterator6 = registration.placeholders[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var placeholder = _step6.value;

            if (first) {
              first = false;
              placeholder.parentNode.insertBefore(registration.target, placeholder);
            }
            this.cleanupPlaceholder(placeholder);
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
              _iterator6.return();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }

        this.cleanupRegistrationTarget(registration);
        this.options.onLoadEnd(target);
        this.options.onLoadComplete(target);
      }
    }, {
      key: 'cleanupPlaceholder',
      value: function cleanupPlaceholder(placeholder) {
        this.intersection.unobserve(placeholder);
        placeholder.parentNode.removeChild(placeholder);
        this.phRegistry.delete(placeholder);
      }
    }, {
      key: 'cleanupRegistrationTarget',
      value: function cleanupRegistrationTarget(registration) {
        this.intersection.unobserve(registration.target); // this only necesarry when we didnt remove the item
        this.phRegistry.delete(registration.target);
        this.loaded.set(registration.target, true);
      }
    }, {
      key: 'onLoadError',
      value: function onLoadError(target, evt) {
        var _resolveTarget3 = this.resolveTarget(target),
            target = _resolveTarget3.target,
            registration = _resolveTarget3.registration;

        var first = true;
        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
          for (var _iterator7 = registration.placeholders[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var placeholder = _step7.value;

            if (first) {
              first = false;
              var errorUI = this.options.createErrorNode(registration.target);
              var _iteratorNormalCompletion8 = true;
              var _didIteratorError8 = false;
              var _iteratorError8 = undefined;

              try {
                for (var _iterator8 = errorUI[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                  var eui = _step8.value;

                  placeholder.parentNode.insertBefore(eui, placeholder);
                }
              } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion8 && _iterator8.return) {
                    _iterator8.return();
                  }
                } finally {
                  if (_didIteratorError8) {
                    throw _iteratorError8;
                  }
                }
              }
            }
            this.cleanupPlaceholder(placeholder);
          }
        } catch (err) {
          _didIteratorError7 = true;
          _iteratorError7 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
              _iterator7.return();
            }
          } finally {
            if (_didIteratorError7) {
              throw _iteratorError7;
            }
          }
        }

        this.cleanupRegistrationTarget(registration);
        this.options.onLoadError(target);
        this.options.onLoadComplete(target);
      }
    }, {
      key: 'createErrorNode',
      value: function createErrorNode() {
        var ele = document.createElement('div');
        ele.innerHTML = this.options.errorHtml;
        return Array.prototype.slice.call(ele.childNodes);
      }
    }, {
      key: 'createPlaceholder',
      value: function createPlaceholder() {
        var ele = document.createElement('div');
        ele.innerHTML = this.options.pendingHtml;
        return Array.prototype.slice.call(ele.childNodes);
      }
    }, {
      key: 'registerPlaceholder',
      value: function registerPlaceholder(node, target, placeholders, extraData) {
        var result = {
          isRegistration: true,
          target: target,
          node: node,
          placeholders: placeholders,
          extraData: extraData,
          loading: false
        };
        this.phRegistry.set(node, result);
        return result;
      }
    }, {
      key: 'resolveTarget',
      value: function resolveTarget(target) {
        var registration = target;
        if (!('isRegistration' in target) || !target.isRegistration) {
          registration = this.phRegistry.get(target);
        } else {
          target = registration.target;
        }
        return {
          target: target,
          registration: registration
        };
      }
    }, {
      key: 'restoreTarget',
      value: function restoreTarget(target) {
        var _resolveTarget4 = this.resolveTarget(target),
            target = _resolveTarget4.target,
            registration = _resolveTarget4.registration;

        var extraData = registration.extraData;
        registration.loading = true;
        this.options.onLoadBegin(target);

        this._restoreTargetInternal(target, extraData);

        if (!extraData.canLoad) {
          this.onLoadComplete(registration);
        }
      }
    }, {
      key: '_restoreTargetInternal',
      value: function _restoreTargetInternal(target, extraData) {
        if (extraData.hasSrcset) {
          target.setAttribute('srcset', extraData.srcset);
        }
        if (extraData.hasSizes) {
          target.setAttribute('sizes', extraData.sizes);
        }
        if (extraData.hasSrc) {
          target.setAttribute('src', extraData.src);
        }
        if (extraData.children.length > 0) {
          for (var i = 0; i < extraData.children.length; i++) {
            var childData = extraData.children[i];
            this._restoreTargetInternal(childData.target, childData);
          }
        }
      }
    }, {
      key: 'captureTarget',
      value: function captureTarget(target, targetRoot) {
        var _this3 = this;

        var store = {
          'target': target,
          'hasSrc': target.hasAttribute('src'),
          'src': target.getAttribute('src'),
          'hasSrcset': target.hasAttribute('srcset'),
          'srcset': target.getAttribute('srcset'),
          'hasSizes': target.hasAttribute('sizes'),
          'sizes': target.getAttribute('sizes'),
          'isLink': 'tagName' in target && target.tagName.match(/link/i),
          'hasHref': target.hasAttribute('href'),
          'href': target.getAttribute('href'),
          'children': [],
          'shouldRestore': false,
          'canLoad': false,
          'shouldInjectHtml': false
        };
        if (store.hasSrc) {
          target.removeAttribute('src');
        }
        if (store.hasSrcset) {
          target.removeAttribute('srcset');
        }
        if (store.hasSizes) {
          target.removeAttribute('sizes');
        }

        if (store.isLink && store.hasHref) {
          store.shouldInjectHtml = true;
        }

        // We do not care about load events of child elements
        if ((store.hasSrc || store.hasSrcset) && target === targetRoot) {
          store.shouldRestore = true;
          store.canLoad = true;
          target.addEventListener('load', function (evt) {
            return _this3.onLoadComplete(targetRoot);
          });
          target.addEventListener('error', function (evt) {
            return _this3.onLoadError(targetRoot, evt);
          });
        }

        if ('tagName' in target && target.tagName.match(/picture|video|audio/i)) {
          if (target === targetRoot) {
            store.shouldRestore = true;
          }
          for (var i = 0; i < target.children.length; i++) {
            var child = target.children[i];
            var desc = this.captureTarget(child);
            desc.index = i;
            store.children.push(desc);
          }
        }

        return store;
      }
    }, {
      key: 'isContextExcluded',
      value: function isContextExcluded(target) {
        if (!target) {
          return false;
        }
        if (!('parentNode' in target)) {
          return false;
        }
        var parent = target.parentNode;
        if (!parent) {
          return false;
        }
        if (!('tagName' in parent)) {
          return false;
        }
        if (parent.tagName.match(/picture|video|audio/i)) {
          return true;
        }

        // need to recurse up for cases like video with embedded html as a fallback
        return this.isContextExcluded(parent);
      }
    }, {
      key: 'observeTarget',
      value: function observeTarget(target) {
        if (this.isLoaded(target)) {
          // do nothing, its already fully loaded
        } else if (this.isContextExcluded(target)) {
          // do nothing, another element should take care of it
        } else {
          var store = this.captureTarget(target, target);
          var placeholders = this.options.createPlaceholder(target);
          var _iteratorNormalCompletion9 = true;
          var _didIteratorError9 = false;
          var _iteratorError9 = undefined;

          try {
            for (var _iterator9 = placeholders[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
              var placeholder = _step9.value;

              this.registerPlaceholder(placeholder, target, placeholders, store);
              target.parentNode.insertBefore(placeholder, target);
              this.intersection.observe(placeholder);
            }
          } catch (err) {
            _didIteratorError9 = true;
            _iteratorError9 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion9 && _iterator9.return) {
                _iterator9.return();
              }
            } finally {
              if (_didIteratorError9) {
                throw _iteratorError9;
              }
            }
          }

          this.registerPlaceholder(target, target, placeholders, store);
          if (this.options.shouldRemove(target)) {
            target.parentNode.removeChild(target);
          } else {
            this.intersection.observe(target);
          }
        }
      }
    }, {
      key: 'observeTargets',
      value: function observeTargets(targets) {
        var _iteratorNormalCompletion10 = true;
        var _didIteratorError10 = false;
        var _iteratorError10 = undefined;

        try {
          for (var _iterator10 = targets[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
            var target = _step10.value;

            this.observeTarget(target);
          }
        } catch (err) {
          _didIteratorError10 = true;
          _iteratorError10 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion10 && _iterator10.return) {
              _iterator10.return();
            }
          } finally {
            if (_didIteratorError10) {
              throw _iteratorError10;
            }
          }
        }
      }
    }, {
      key: 'isTargetMatch',
      value: function isTargetMatch(target) {
        if (this.loaded.has(target)) {
          return false;
        }
        return 'matches' in target && target.matches(this.options.selector);
      }
    }, {
      key: 'queryTargets',
      value: function queryTargets() {
        var result = [];
        var _iteratorNormalCompletion11 = true;
        var _didIteratorError11 = false;
        var _iteratorError11 = undefined;

        try {
          for (var _iterator11 = document.querySelectorAll(this.options.selector)[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
            var node = _step11.value;

            result.push(node);
          }
        } catch (err) {
          _didIteratorError11 = true;
          _iteratorError11 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion11 && _iterator11.return) {
              _iterator11.return();
            }
          } finally {
            if (_didIteratorError11) {
              throw _iteratorError11;
            }
          }
        }

        return result;
      }
    }, {
      key: 'shouldRemove',
      value: function shouldRemove(t) {
        return !('tagName' in t) || !t.tagName.match(/link/i);
      }
    }]);

    function DemandJS(options) {
      var _this4 = this;

      _classCallCheck(this, DemandJS);

      this.phRegistry = new WeakMap();
      this.loaded = new WeakMap();
      this.options = Object.assign({
        pendingHtml: '<div style="width:100%;height:100%">Loading In Progress</div>',
        errorHtml: '<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>',
        createPlaceholder: function createPlaceholder(t) {
          return _this4.createPlaceholder();
        },
        createErrorNode: function createErrorNode(t) {
          return _this4.createErrorNode();
        },
        shouldRemove: function shouldRemove(t) {
          return !('tagName' in t) || !t.tagName.match(/link/i);
        },
        shouldInsertOnLoad: function shouldInsertOnLoad(t) {
          return _this4.options.shouldRemove(t);
        },
        selector: 'img,video,picture,iframe,link.demand',
        rootMargin: '48px',
        threshold: 0,
        onLoadBegin: function onLoadBegin(t) {},
        onLoadEnd: function onLoadEnd(t) {},
        onLoadError: function onLoadError(t) {},
        onLoadComplete: function onLoadComplete(t) {}
      }, options);
      this.mutation = new MutationObserver(function (a, b) {
        return _this4.observeMutation(a, b);
      });
      this.mutationOptions = {
        childList: true,
        subtree: true
      };

      this.intersectionOptions = {
        root: null,
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      };
      this.intersection = new IntersectionObserver(function (a, b) {
        return _this4.observeIntersection(a, b);
      }, this.intersectionOptions);

      this.observeTargets(this.queryTargets());
      this.mutation.observe(document.body, this.mutationOptions);
    }

    return DemandJS;
  }();

  window.DemandJS = DemandJS;
})(window);

//# sourceMappingURL=demand.js.map