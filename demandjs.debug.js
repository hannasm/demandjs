'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** @preserve DemandJS - v.1.0.0-rc.6
 *
 * https://github.com/hannasm/demandjs
 *
 **/
(function (ctx) {
  var DemandJS = function () {
    _createClass(DemandJS, [{
      key: 'observeMutation',
      value: function observeMutation(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var mutation = mutations[i];
          if (mutation.type !== 'childList') {
            continue;
          }
          for (var j = 0; j < mutation.addedNodes.length; j++) {
            var added = mutation.addedNodes[j];
            // haven't identified why this happens, maybe document.createElement()?
            if (!added.parentNode) {
              continue;
            }
            this.checkAdditionRecursive(added);
          }
        }
      }
    }, {
      key: 'checkAdditionRecursive',
      value: function checkAdditionRecursive(added) {
        if (this.observed.has(added)) {
          return;
        }
        this.observed.set(added, true);

        var res = this.isTargetMatch(added);
        if (!res.loaded) {
          if (res.isScript && res.injecting) {
            this.injectedScript(added, res.injecting);
            return;
          } else if (res.isMatch) {
            this.observeTarget(added);
            return;
          }
        }

        if (added.children) {
          // modifying collectino while enumerating it leads to bad things so we need to make a copy 
          // before we do anything else with the children here
          var children = Array.prototype.slice.call(added.children);
          for (var i = 0; i < children.length; i++) {
            var child = children[i];
            this.checkAdditionRecursive(child);
          }
        }
      }
    }, {
      key: 'observeIntersection',
      value: function observeIntersection(intersections) {
        for (var i = 0; i < intersections.length; i++) {
          var intersect = intersections[i];
          if (!intersect.isIntersecting || intersect.intersectionRatio <= 0) {
            continue;
          }
          var reg = this.phRegistry.get(intersect.target);
          if (reg === undefined || reg.loading) {
            continue;
          }
          reg.loading = true;
          this.beginLoad(reg);
        }
      }
    }, {
      key: 'beginLoad',
      value: function beginLoad(target) {
        var _this = this;

        var _resolveTarget = this.resolveTarget(target),
            target = _resolveTarget.target,
            registration = _resolveTarget.registration;

        if (registration.extraData.shouldInjectLink) {
          var url = registration.extraData.href;

          var onLoadBegin = this.selectByDemandClass(target, this.options.onLoadBegin, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadBegin);
          onLoadBegin.call(this, target);

          fetch(url).then(function (response) {
            if (!response.ok) {
              var error = new Error('Fetching "' + url + '" failed with ' + response.status + ' ' + response.statusText);
              error.responseDetail = response;
              throw error;
            }
            return response.text();
          }).then(function (txt) {
            _this.injectLink(registration, txt);
          }).catch(function (ex) {
            _this.handleError(registration, ex);
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
      key: 'isResourceLoaded',
      value: function isResourceLoaded(target) {
        return target.complete || false;
      }
    }, {
      key: 'injectLink',
      value: function injectLink(target, txt) {
        var _resolveTarget2 = this.resolveTarget(target),
            target = _resolveTarget2.target,
            registration = _resolveTarget2.registration;

        var previewLoading = this.selectByDemandClass(target, this.options.previewLoading, this.options.demandClassAttribute, this.options.defaultDemandClass, false);
        // if loading preview requested, never finish loading anything
        if (previewLoading) {
          return;
        }

        var previewFailure = this.selectByDemandClass(target, this.options.previewFailure, this.options.demandClassAttribute, this.options.defaultDemandClass, false);
        // if error preview requested, treat load success as load errors
        if (previewFailure) {
          this.handleError(target, new Error('found failure preview in options'));
          return;
        }

        var type = registration.extraData.type;
        if (type in this.options.linkHandler) {
          var handler = this.options.linkHandler[type];
          handler(target, txt);
        } else {
          throw 'Unknown link demand with content type: ' + type;
        }
        this.processSuccess(registration);
      }
    }, {
      key: 'injectedScript',
      value: function injectedScript(bc, injecting) {
        var _this2 = this;

        var localScriptId = injecting.id;
        var codePromise = Promise.resolve(bc.innerHTML);
        if ('src' in bc && !!bc.src) {
          codePromise = fetch(bc.src).then(function (response) {
            if (!response.ok) {
              throw Error(response.status + '_' + response.statusText);
            }
            return response.text();
          });
          localScriptId = bc.src + '#' + localScriptId;
        }
        codePromise.then(function (code) {
          _this2.injectScript(bc, injecting.href + '.demand[' + localScriptId + '].js', code);
        });
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
        var root = document.createElement('html');
        root.innerHTML = txt;
        var bodies = root.getElementsByTagName('body');
        var injectionId = 1;
        bodies = Array.prototype.slice.call(bodies);
        for (var i = 0; i < bodies.length; i++) {
          var body = bodies[i];
          var clds = Array.prototype.slice.call(body.children);
          for (var j = 0; j < clds.length; j++) {
            var bc = clds[j];
            this.injecting.set(bc, {
              href: target.href,
              id: injectionId
            });
            injectionId += 1;
            target.parentNode.insertBefore(bc, target);
          }
        }
      }
    }, {
      key: 'processSuccess',
      value: function processSuccess(target) {
        var _resolveTarget3 = this.resolveTarget(target),
            target = _resolveTarget3.target,
            registration = _resolveTarget3.registration;

        var previewLoading = this.selectByDemandClass(target, this.options.previewLoading, this.options.demandClassAttribute, this.options.defaultDemandClass, false);
        // if loading preview requested, never finish loading anything
        if (previewLoading) {
          return;
        }

        var previewFailure = this.selectByDemandClass(target, this.options.previewFailure, this.options.demandClassAttribute, this.options.defaultDemandClass, false);
        // if error preview requested, treat load success as load errors
        if (previewFailure) {
          this.handleError(target, new Error('found failure preview in options'));
          return;
        }

        // iframe load event being triggered twice
        if (!registration) {
          return;
        }

        if (registration.extraData.insertToLoad) {
          target.style.display = registration.extraData.display;
        }

        var first = this.options.shouldInsertOnLoad(registration.target);
        for (var i = 0; i < registration.placeholders.length; i++) {
          var placeholder = registration.placeholders[i];
          if (first) {
            first = false;
            placeholder.parentNode.insertBefore(registration.target, placeholder);
          }
          this.cleanupPlaceholder(placeholder);
        }
        this.cleanupRegistrationTarget(registration);

        var onLoadSuccess = this.selectByDemandClass(target, this.options.onLoadSuccess, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadSuccess);
        onLoadSuccess.call(this, target);
        var onLoadComplete = this.selectByDemandClass(target, this.options.onLoadComplete, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadComplete);
        onLoadComplete.call(this, target);
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
      key: 'handleError',
      value: function handleError(target, ex) {
        var _resolveTarget4 = this.resolveTarget(target),
            target = _resolveTarget4.target,
            registration = _resolveTarget4.registration;

        // error event being triggered twice


        if (!registration) {
          return;
        }

        if (!(ex && ex.stack && ex.message)) {
          if (!ex) {
            ex = new Error("No error was provided on load");
          } else {
            ex = new Error(ex);
          }
        }
        var onLoadFailure = this.selectByDemandClass(target, this.options.onLoadFailure, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadFailure);

        if (registration.extraData.insertToLoad) {
          target.style.display = registration.extraData.display;
        }

        var first = true;
        for (var i = 0; i < registration.placeholders.length; i++) {
          var placeholder = registration.placeholders[i];
          if (first) {
            first = false;

            if (!target.parentNode || registration.extraData.insertToLoad) {
              placeholder.parentNode.insertBefore(target, placeholder);
            }

            onLoadFailure.call(this, target, ex);
          }
          this.cleanupPlaceholder(placeholder);
        }
        if (first) {
          onLoadFailure.call(this, target, ex);
        }

        this.cleanupRegistrationTarget(registration);
        var onLoadComplete = this.selectByDemandClass(target, this.options.onLoadComplete, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadComplete);
        onLoadComplete.call(this, target);
      }
    }, {
      key: 'onLoadBegin',
      value: function onLoadBegin(t) {
        //  nothing to do here
      }
    }, {
      key: 'onLoadSuccess',
      value: function onLoadSuccess(target) {
        //  nothing to do here
      }
    }, {
      key: 'onLoadComplete',
      value: function onLoadComplete(target) {
        //  nothing to do here
      }
    }, {
      key: 'onLoadFailure',
      value: function onLoadFailure(target, ex) {
        var createFailureNode = this.selectByDemandClass(target, this.options.createFailureNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.createFailureNode);
        var errorUI = createFailureNode.call(this, target, ex);
        errorUI = Array.prototype.slice.call(errorUI);
        for (var i = 0; i < errorUI.length; i++) {
          var eui = errorUI[i];
          // register placeholders so if they contain media we dont try to demand load them...
          this.loaded.set(eui, true);

          target.parentNode.insertBefore(eui, target);
        }
        if (this.options.shouldRemove(target)) {
          target.parentNode.removeChild(target);
        }
      }
    }, {
      key: 'selectByDemandClass',
      value: function selectByDemandClass(t, data, attr, defaultKey, defaultData) {
        if (!data) {
          return defaultData;
        }
        if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
          var key = defaultKey;
          if (t.hasAttribute(attr)) {
            key = t.getAttribute(attr);
          }
          do {
            if (key in data) {
              data = data[key];
              break;
            } else if (key === defaultKey) {
              data = defaultData;
              break;
            }
            key = defaultKey;
          } while (true);
        }

        return data;
      }
    }, {
      key: 'createFailureNode',
      value: function createFailureNode(t, ex) {
        var ele = document.createElement('div');

        var html = this.selectByDemandClass(t, this.options.failureHtml, this.options.demandClassAttribute, this.options.defaultDemandClass, this.defaultFailureHtml);
        ele.innerHTML = html;

        return ele.childNodes;
      }
    }, {
      key: 'createLoadingNode',
      value: function createLoadingNode(t) {
        var ele = document.createElement('div');

        var html = this.selectByDemandClass(t, this.options.loadingHtml, this.options.demandClassAttribute, this.options.defaultDemandClass, this.defaultLoadingHtml);
        ele.innerHTML = html;

        return ele.childNodes;
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
        var _resolveTarget5 = this.resolveTarget(target),
            target = _resolveTarget5.target,
            registration = _resolveTarget5.registration;

        var extraData = registration.extraData;
        registration.loading = true;

        var onLoadBegin = this.selectByDemandClass(target, this.options.onLoadBegin, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadBegin);
        onLoadBegin.call(this, target);

        this._restoreTargetInternal(target, extraData);

        if (!extraData.canLoad) {
          this.processSuccess(registration);
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

        if (extraData.insertToLoad) {
          target.style.display = 'none';
          this.loaded.set(target);
          document.body.appendChild(target);
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
          'insertToLoad': 'tagName' in target && target.tagName.match(/iframe/i),
          'hasHref': target.hasAttribute('href'),
          'href': target.getAttribute('href'),
          'hasType': target.hasAttribute('type'),
          'type': target.getAttribute('type'),
          'hasDisplay': target.style && target.style.display,
          'display': target.style.display || '',
          'children': [],
          'shouldRestore': false,
          'canLoad': false,
          'shouldInjectLink': false
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
          store.shouldInjectLink = true;
          if (!store.hasType) {
            store.type = 'text/html';
          }
        }

        // We do not care about load events of child elements
        if ((store.hasSrc || store.hasSrcset) && target === targetRoot) {
          store.shouldRestore = true;
          store.canLoad = true;

          if ('tagName' in target && target.tagName.match(/video|audio/i)) {
            target.addEventListener('loadedmetadata', function (evt) {
              return _this3.processSuccess(targetRoot);
            });
            target.addEventListener('loadeddata', function (evt) {
              return _this3.processSuccess(targetRoot);
            });
          } else {
            target.addEventListener('load', function (evt) {
              return _this3.processSuccess(targetRoot);
            });
          }

          if (store.hasSrcset && store.hasSrc) {
            target.addEventListener('error', function (evt) {
              _this3.handleError(targetRoot, new Error('Loading for srcset and src failed (' + store.srcset + ')(' + store.src + ')'));
            });
          } else if (store.hasSrcset) {
            target.addEventListener('error', function (evt) {
              _this3.handleError(targetRoot, new Error('Loading for srcset failed (' + store.srcset + ')'));
            });
          } else if (store.hasSrc) {
            target.addEventListener('error', function (evt) {
              _this3.handleError(targetRoot, new Error('Loading for src failed (' + store.src + ')'));
            });
          } else {
            target.addEventListener('error', function (evt) {
              _this3.handleError(targetRoot, new Error('Loading srced element failed (FALLBACK ERROR MSG)'));
            });
          }
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
        if (this.isResourceLoaded(target)) {
          // do nothing, its already fully loaded
        } else if (this.isContextExcluded(target)) {
          // do nothing, another element should take care of it
        } else {
          var store = this.captureTarget(target, target);

          var createLoadingNode = this.selectByDemandClass(target, this.options.createLoadingNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.createLoadingNode);
          var placeholders = createLoadingNode.call(this, target);
          placeholders = Array.prototype.slice.call(placeholders);

          for (var i = 0; i < placeholders.length; i++) {
            var placeholder = placeholders[i];
            this.registerPlaceholder(placeholder, target, placeholders, store);
            // register placeholders so if they contain media we dont try to demand load them...
            this.loaded.set(placeholder, true);
            target.parentNode.insertBefore(placeholder, target);
            this.intersection.observe(placeholder);
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
        for (var i = 0; i < targets.length; i++) {
          var target = targets[i];
          this.observeTarget(target);
        }
      }
    }, {
      key: 'isLoadedRecursive',
      value: function isLoadedRecursive(target, injecting) {
        if (this.loaded.has(target)) {
          return { loaded: true, injecting: injecting || this.injecting.get(target) };
        }
        // we cant be injecting an element and loading it simultaneously
        if (!injecting && target.parentNode) {
          return this.isLoadedRecursive(target.parentNode, injecting || this.injecting.get(target));
        }
        return { loaded: false, injecting: injecting || this.injecting.get(target) };
      }
    }, {
      key: 'isScript',
      value: function isScript(bc) {
        return !!('tagName' in bc && bc.tagName.match(/^script$/i));
      }
    }, {
      key: 'isTargetMatch',
      value: function isTargetMatch(target) {
        var isMatch = 'matches' in target && target.matches(this.options.selector);
        isMatch = isMatch && !(this.options.ignoreSelector && target.matches(this.options.ignoreSelector));

        var isScript = this.isScript(target);

        if (!isMatch && !isScript) {
          return { isMatch: isMatch, isScript: isScript, loaded: false, injecting: false };
        }

        var result = this.isLoadedRecursive(target, false);
        result.isMatch = isMatch;
        result.isScript = isScript;
        return result;
      }
    }, {
      key: 'queryTargets',
      value: function queryTargets() {
        var result = [];
        var nodes = document.querySelectorAll(this.options.selector);
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if (this.options.ignoreSelector && 'matches' in node && node.matches(this.options.ignoreSelector)) {
            continue;
          }
          result.push(node);
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
      this.injecting = new WeakMap();
      this.observed = new WeakMap();

      var newHandlers = {};
      if (options && 'linkHandler' in options) {
        newHandlers = options.linkHandler;
        delete options.linkHandler;
      }

      this.defaultLoadingHtml = '<div style="width:100%;height:100%">Loading In Progress</div>';
      this.defaultFailureHtml = '<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>';

      this.options = Object.assign({
        previewLoading: false,
        previewFailure: false,
        demandClassAttribute: 'data-demand',
        defaultDemandClass: 'default',
        loadingHtml: this.defaultLoadingHtml,
        failureHtml: this.defaultFailureHtml,
        createLoadingNode: function createLoadingNode(t) {
          return _this4.createLoadingNode(t);
        },
        createFailureNode: function createFailureNode(t, ex) {
          return _this4.createFailureNode(t, ex);
        },
        shouldRemove: function shouldRemove(t) {
          return !('tagName' in t) || !t.tagName.match(/link/i);
        },
        shouldInsertOnLoad: function shouldInsertOnLoad(t) {
          return _this4.options.shouldRemove(t);
        },
        selector: 'img,video,picture,iframe,link.demand',
        ignoreSelector: '.nodemand',
        rootMargin: '48px',
        threshold: 0.001,
        onLoadBegin: function onLoadBegin(t) {
          return _this4.onLoadBegin(t);
        },
        onLoadSuccess: function onLoadSuccess(t) {
          return _this4.onLoadSuccess(t);
        },
        onLoadFailure: function onLoadFailure(t, e) {
          return _this4.onLoadFailure(t, e);
        },
        onLoadComplete: function onLoadComplete(t) {
          return _this4.onLoadComplete(t);
        },
        linkHandler: {
          'text/html': function textHtml(t, c) {
            return _this4.injectHtml(t, c);
          },
          'application/xhtml+xml': function applicationXhtmlXml(t, c) {
            return _this4.injectHtml(t, c);
          }
        }
      }, options);
      this.options.linkHandler = Object.assign(this.options.linkHandler, newHandlers);

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

      var targets = this.queryTargets();
      this.observeTargets(targets);
      this.mutation.observe(document.body, this.mutationOptions);
    }

    return DemandJS;
  }();

  ctx['DemandJS'] = DemandJS;
})(window);
/** @license MIT License

Copyright (c) 2017 Sean Hanna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

//# sourceMappingURL=demandjs.debug.js.map