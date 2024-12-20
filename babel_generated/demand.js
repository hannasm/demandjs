'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** @preserve DemandJS - v.1.0.0-rc.14
 *
 * https://github.com/hannasm/demandjs
 **/
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.DemandJS = factory();
  }
})(typeof self !== 'undefined' ? self : undefined, function (ctx) {
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
          for (var j = 0; j < mutation.removedNodes.length; j++) {
            var removed = mutation.removedNodes[j];
            this.checkRemovalsRecursive(removed);
          }
        }
      }
    }, {
      key: 'checkRemovalsRecursive',
      value: function checkRemovalsRecursive(removed) {
        var remaining = [removed];
        while (remaining.length > 0) {
          removed = remaining.shift();
          if (this.hasRegistration(removed)) {
            var _resolveTarget = this.resolveTarget(removed),
                target = _resolveTarget.target,
                registration = _resolveTarget.registration;

            if (!registration.loaded) {
              continue;
            }

            if (registration.expectRemove) {
              registration.expectRemove = false;
              continue;
            }
            if (target.node === target.target) {
              this.cleanupRegistrationTarget(registration);
              continue;
            } else {
              this.cleanupPlaceholder(registration);
              continue;
            }
          }

          if (removed.children) {
            for (var i = 0; i < removed.children.length; i++) {
              remaining.push(removed.children[i]);
            }
          }
        }
      }
    }, {
      key: 'checkAdditionRecursive',
      value: function checkAdditionRecursive(added) {
        var remaining = [added];
        while (remaining.length > 0) {
          added = remaining.shift();
          if (this.observed.has(added)) {
            continue;
          }
          this.observed.set(added, true);

          var res = this.isTargetMatch(added);
          if (!res.loaded) {
            if (res.isScript && res.injecting) {
              this.injectedScript(added, res.injecting);
              continue;
            } else if (res.isMatch) {
              this.observeTarget(added);
              continue;
            }
          }

          if (added.children) {
            for (var i = 0; i < added.children.length; i++) {
              var child = added.children[i];
              remaining.push(child);
            }
          }
        }
      }
    }, {
      key: 'observeAttributeMutation',
      value: function observeAttributeMutation(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var mutation = mutations[i];
          if (mutation.type !== 'attributes') {
            continue;
          }
          var node = mutation.target;
          if (!this.hasRegistration(node)) {
            continue;
          }

          var aname = mutation.attributeName;

          var _resolveTarget2 = this.resolveTarget(node),
              target = _resolveTarget2.target,
              registration = _resolveTarget2.registration;

          if (!registration.loaded) {
            if (!target.hasAttribute(aname)) {
              continue;
            }
            if (val == registration.extraData[aname]) {
              continue;
            }
            if (val === '') {
              continue;
            }

            var reg = registration;
            var val = target.getAttribute(aname);
            switch (aname) {
              case "src":
                reg.extraData.src = val;
                reg.extraData.hasSrc = true;
                if (!registration.loading) {
                  target.removeAttribute('src');
                }
                break;
              case 'href':
                reg.extraData.href = val;
                reg.extraData.hasHref = true;
                break;
              case 'srcset':
                reg.extraData.srcset = val;
                reg.extraData.hasSrcset = true;
                if (!registration.loading) {
                  target.removeAttribute('srcset');
                }
                break;
              case 'sizes':
                reg.extraData.sizes = val;
                reg.extraData.hasSizes = true;
                if (!registration.loading) {
                  target.removeAttribute('sizes');
                }
                break;
              case 'type':
                reg.extraData.type = val;
                reg.extraData.hasType = true;
                break;
            }
            continue;
          }

          this.cleanupRegistrationTarget(target);

          var mc = this.isTargetMatch(target);
          if (mc.isMatch) {
            this.observeTarget(target, registration);
            return;
          }
        }
      }
    }, {
      key: 'cooperativeExecute',
      value: function cooperativeExecute() {
        var func = this.queuedFuncs.shift();
        func();
        if (this.queuedFuncs.length > 0) {
          var self = this;
          setTimeout(function () {
            self.cooperativeExecute();
          }, 0);
        }
      }
    }, {
      key: 'cooperativeQueue',
      value: function cooperativeQueue(func) {
        this.queuedFuncs.push(func);
        if (this.queuedFuncs.length === 1) {
          var self = this;
          setTimeout(function () {
            self.cooperativeExecute();
          }, 0);
        }
      }
    }, {
      key: 'observeIntersection',
      value: function observeIntersection(intersections) {
        var _this = this;

        var self = this;
        for (var i = 0; i < intersections.length; i++) {
          var intersect = intersections[i];
          if (intersect.isIntersecting && intersect.intersectionRatio > 0) {
            var _ret = function () {
              var reg = _this.phRegistry.get(intersect.target);
              if (reg === undefined || reg.loading) {
                return 'continue';
              }
              reg = _this.phRegistry.get(reg.target);
              if (reg === undefined || reg.loading) {
                return 'continue';
              }

              _this.cooperativeQueue(function () {
                if (reg.extraData.isOffloadingPending) {
                  return;
                }

                self.beginLoad(reg);
              });
            }();

            if (_ret === 'continue') continue;
          }
        }
      }
    }, {
      key: 'observeOutersection',
      value: function observeOutersection(intersections) {
        var _this2 = this;

        var self = this;
        for (var i = 0; i < intersections.length; i++) {
          var intersect = intersections[i];
          if (!intersect.isIntersecting || intersect.intersectionRatio <= 0) {
            var _ret2 = function () {
              var reg = _this2.phRegistry.get(intersect.target);
              if (reg === undefined) {
                return 'continue';
              }
              reg = _this2.phRegistry.get(reg.target);
              if (reg === undefined) {
                return 'continue';
              }
              if (!reg.loaded) {
                return 'continue';
              }
              var target = reg.target;

              var dims = target.getBoundingClientRect();

              // if the element has no dimensions treat it as if it hasn't actually loaded yet because
              // offloaded images need to use these dimensions to preserve the same page layout when swapping
              // in the unloaded graphics
              if (dims.width == 0 || dims.height == 0) {
                return 'continue';
              }

              target.setAttribute('data-demandjs-width', dims.width);
              target.setAttribute('data-demandjs-height', dims.height);
              reg.extraData.isOffloadingPending = true;

              _this2.cooperativeQueue(function () {
                self.cleanupRegistrationTarget(target);
                var mc = self.isTargetMatch(target);
                if (mc.isMatch) {
                  self.observeTarget(target, reg);
                }
              });
            }();

            if (_ret2 === 'continue') continue;
          }
        }
      }
    }, {
      key: 'beginLoad',
      value: function beginLoad(target) {
        var _this3 = this;

        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget3 = this.resolveTarget(target),
            target = _resolveTarget3.target,
            registration = _resolveTarget3.registration;

        if (registration.loading) {
          return;
        }
        registration.loading = true;
        if (registration.extraData.shouldInjectLink) {
          var url = registration.extraData.href;

          var onLoadBegin = this.selectByDemandClass(target, this.options.onLoadBegin, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadBegin);
          onLoadBegin.call(this, target);

          url = this.predictUrl(target, url);
          registration.extraData.startTime = performance.now();

          fetch(url).then(function (response) {
            if (!response.ok) {
              var error = new Error('Fetching "' + url + '" failed with ' + response.status + ' ' + response.statusText);
              error.responseDetail = response;
              throw error;
            }
            return response.text();
          }).then(function (txt) {
            _this3.injectLink(registration, txt);
          }).catch(function (ex) {
            _this3.handleError(registration, ex);
          });
        } else if (registration && registration.extraData && registration.extraData.shouldRestore) {
          // setTimeout helps keep loading animations smooth
          setTimeout(function () {
            return _this3.restoreTarget(registration);
          }, 0);
        } else {
          console.warn('DEMANDJS: unknown load operation - ignored');
        }
      }
    }, {
      key: 'isResourceLoaded',
      value: function isResourceLoaded(target) {
        return target.loaded || false;
      }
    }, {
      key: 'injectLink',
      value: function injectLink(target, txt) {
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget4 = this.resolveTarget(target),
            target = _resolveTarget4.target,
            registration = _resolveTarget4.registration;

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
          console.warn('DEMANDJS: Unknown link demand with content type: ' + type);
        }
        this.processSuccess(registration);
      }
    }, {
      key: 'injectedScript',
      value: function injectedScript(bc, injecting) {
        var _this4 = this;

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
        codePromise = codePromise.then(function (code) {
          _this4.injectScript(bc, injecting.href + '.demand[' + localScriptId + '].js', code);
        });
        codePromise = codePromise.catch(function (ex) {
          _this4.handleError(bc, ex);
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

        var codeToExecute = new Function(code + "\n" + '//@ sourceURL=' + id + "\n" + '//# sourceURL=' + id);
        codeToExecute();

        if (content !== '') {

          if (!this.hasRegistration(target)) {
            // registration is requried for injecting content so we create a dummy registration here, 
            // may need to consider a better way to do this though
            var registration = this.registerPlaceholder(target, target, [], {});
            target.href = id;
          }

          this.injectHtml(target, '<body>' + content + '</body>');
        }

        document.write = oldDw;
      }
    }, {
      key: 'injectHtml',
      value: function injectHtml(target, txt) {
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget5 = this.resolveTarget(target),
            target = _resolveTarget5.target,
            registration = _resolveTarget5.registration;

        var injectNode = this.selectByDemandClass(target, this.options.injectNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.injectNode);

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
            this.scrollSave();
            injectNode.call(this, bc, target);
            this.scrollRestore();
            if (registration && registration.elements) {
              registration.elements.push(bc);
            }
          }
        }
      }
    }, {
      key: 'injectNode',
      value: function injectNode(injecting, target, context) {
        target.parentNode.insertBefore(injecting, target);
      }
    }, {
      key: 'isOffloadingEnabled',
      value: function isOffloadingEnabled(target) {
        return this.selectByDemandClass(target, this.options.enableOffloading, this.options.demandClassAttribute, this.options.defaultDemandClass, false);
      }
    }, {
      key: 'shouldTrackOffloading',
      value: function shouldTrackOffloading(target) {
        if (target.nodeName !== 'IMG' && target.nodeName !== 'VIDEO' && target.nodeName !== 'PICTURE') {
          return false;
        }
        return this.isOffloadingEnabled(target);
      }
    }, {
      key: 'processSuccess',
      value: function processSuccess(target) {
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget6 = this.resolveTarget(target),
            target = _resolveTarget6.target,
            registration = _resolveTarget6.registration;

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
        if (!registration || registration.loaded) {
          return;
        }

        if (registration.extraData.insertToLoad) {
          var ph = registration.placeholders[0];
          var cap = registration.extraData;
          registration.target.style.display = cap.display;
          registration.expectRemove = true;
          this.scrollSave();
          var injectNode = this.selectByDemandClass(target, this.options.injectNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.injectNode);
          injectNode.call(this, registration.target, ph, 'processSuccess');
          this.scrollRestore();
        } else if (this.options.shouldInsertOnLoad(registration.target)) {
          var ph = registration.placeholders[0];
          var cap = registration.extraData;
          registration.target.style.display = cap.display;
        }

        // remove all placeholders
        this.cleanupPlaceholders(registration);

        registration.loaded = true;
        registration.extraData.endTime = performance.now();
        this.recordPerformance(target, false);

        if (this.shouldTrackOffloading(target)) {
          this.outersection.observe(target);
        }

        var onLoadSuccess = this.selectByDemandClass(target, this.options.onLoadSuccess, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadSuccess);
        onLoadSuccess.call(this, target);
        var onLoadComplete = this.selectByDemandClass(target, this.options.onLoadComplete, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadComplete);
        onLoadComplete.call(this, target);
      }
    }, {
      key: 'cleanupPlaceholders',
      value: function cleanupPlaceholders(registration) {
        if (!registration) {
          return;
        }
        if (!this.hasRegistration(registration)) {
          return;
        }

        var _resolveTarget7 = this.resolveTarget(registration),
            target = _resolveTarget7.target,
            registration = _resolveTarget7.registration;

        for (var i = 0; i < registration.placeholders.length; i++) {
          this.cleanupPlaceholder(registration.placeholders[i], false);
        }
        registration.placeholders = [];
      }
    }, {
      key: 'scrollSave',
      value: function scrollSave() {
        // when we saved off window scroll offsets and they were later restored after modifying the dom, it really caused major headaches
        return;
      }
    }, {
      key: 'scrollRestore',
      value: function scrollRestore() {
        // when we saved off window scroll offsets and they were later restored after modifying the dom, it really caused major headaches
        return;
      }
    }, {
      key: 'cleanupPlaceholder',
      value: function cleanupPlaceholder(placeholder, removeFromTarget) {
        if (!this.hasRegistration(placeholder)) {
          return;
        }
        if (typeof removeFromTarget === 'undefined') {
          removeFromTarget = true;
        }

        this.intersection.unobserve(placeholder);

        this.scrollSave();
        placeholder.remove();
        this.scrollRestore();

        this.phRegistry.delete(placeholder);
        this.observed.delete(placeholder);
        this.injecting.delete(placeholder);

        if (removeFromTarget) {
          var phres = this.resolveTarget(placeholder);

          var _resolveTarget8 = this.resolveTarget(phres.registration.target),
              target = _resolveTarget8.target,
              registration = _resolveTarget8.registration;

          registration.placeholders = registration.placeholders.filter(function (ph) {
            return ph != placeholder;
          });
        }
      }
    }, {
      key: 'cleanupRegistrationTarget',
      value: function cleanupRegistrationTarget(registration) {
        if (!this.hasRegistration(registration)) {
          return;
        }

        var _resolveTarget9 = this.resolveTarget(registration),
            target = _resolveTarget9.target,
            registration = _resolveTarget9.registration;

        this.cleanupPlaceholders(registration);

        this.observed.delete(target);
        this.injecting.delete(target);
        this.intersection.unobserve(target); // this only necesarry when we didnt remove the item
        if (this.isOffloadingEnabled(target)) {
          this.outersection.unobserve(target);
        }
        this.phRegistry.delete(target);
        registration.extraData.listeners.forEach(function (l) {
          return target.removeEventListener(l.type, l.listener);
        });
        for (var i = 0; i < registration.extraData.children.length; i++) {
          var child = registration.extraData.children[i];
          this.cleanupRegistrationTarget(child.target);
        }
        var self = this;
        registration.elements.forEach(function (e) {
          self.scrollSave();
          e.remove();
          self.scrollRestore();
        });
      }
    }, {
      key: 'reloadTarget',
      value: function reloadTarget(target) {
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget10 = this.resolveTarget(target),
            target = _resolveTarget10.target,
            registration = _resolveTarget10.registration;

        if (registration.loading && !registration.loaded) {
          return;
        } // already loading
        registration.loading = false;
        registration.loaded = false;
        registration.retryCount = 0;
        this.clearAttributes(target, registration.extraData);
        this.beginLoad(target);
      }
    }, {
      key: 'handleError',
      value: function handleError(target, ex) {
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget11 = this.resolveTarget(target),
            target = _resolveTarget11.target,
            registration = _resolveTarget11.registration;

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
          this.scrollSave();
          target.remove();
          this.scrollRestore();
          target.style.display = 'none';
        }

        this.cleanupPlaceholders(registration);
        onLoadFailure.call(this, target, ex);

        // remove placeholders

        registration.loaded = true;
        registration.extraData.endTime = performance.now();
        this.recordPerformance(target, true);

        var retryOnError = this.selectByDemandClass(target, this.options.retryOnError, this.options.demandClassAttribute, this.options.defaultDemandClass, false);
        var maxRetries = this.selectByDemandClass(target, this.options.maxRetries, this.options.demandClassAttribute, this.options.defaultDemandClass, 2);
        if (retryOnError && registration.retryCount < maxRetries) {
          registration.loading = false;
          registration.loaded = false;
          registration.retryCount += 1;
          registration.retryDelay = 500 * Math.pow(2, registration.retryCount);
          this.clearAttributes(target, registration.extraData);
          var self = this;
          setTimeout(function () {
            self.beginLoad(target);
          }, registration.retryDelay);
        } else {
          var onLoadComplete = this.selectByDemandClass(target, this.options.onLoadComplete, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadComplete);
          onLoadComplete.call(this, target);
        }
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
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget12 = this.resolveTarget(target),
            target = _resolveTarget12.target,
            registration = _resolveTarget12.registration;

        var createFailureNode = this.selectByDemandClass(target, this.options.createFailureNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.createFailureNode);
        var errorUI = createFailureNode.call(this, target, ex);
        errorUI = Array.prototype.slice.call(errorUI);

        var placeholders = registration.placeholders = registration.placeholders.concat(errorUI);

        for (var i = 0; i < errorUI.length; i++) {
          var eui = errorUI[i];
          var errReg = this.registerPlaceholder(eui, target, placeholders, registration.extraData);
          // register placeholders so if they contain media we dont try to demand load them...
          errReg.loaded = true;

          this.scrollSave();
          var injectNode = this.selectByDemandClass(target, this.options.injectNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.injectNode);
          injectNode.call(this, eui, target, 'loadFailure');
          this.scrollRestore();
        }
        if (this.options.shouldRemove(target)) {
          if (registration.extraData.insertToLoad) {
            registration.expectRemove = true;
            this.scrollSave();
            target.remove();
            this.scrollRestore();
          } else {
            target.style.display = 'none';
          }
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
          loading: false,
          elements: [],
          loaded: false,
          expectRemove: false,
          retryCount: 0
        };
        this.phRegistry.set(node, result);
        this.observed.set(node, true);
        return result;
      }
    }, {
      key: 'hasRegistration',
      value: function hasRegistration(target) {
        // if we are passed a registration get the contained target
        if ('isRegistration' in target && target.isRegistration) {
          target = target.node;
        }

        return this.phRegistry.has(target);
      }
    }, {
      key: 'resolveTarget',
      value: function resolveTarget(target) {
        var registration = target;
        if (target && (!('isRegistration' in target) || !target.isRegistration)) {
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
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget13 = this.resolveTarget(target),
            target = _resolveTarget13.target,
            registration = _resolveTarget13.registration;

        var extraData = registration.extraData;

        var onLoadBegin = this.selectByDemandClass(target, this.options.onLoadBegin, this.options.demandClassAttribute, this.options.defaultDemandClass, this.onLoadBegin);
        onLoadBegin.call(this, target);

        this._restoreTargetInternal(target, extraData);

        if (!extraData.canLoad) {
          this.processSuccess(registration);
        }
      }
    }, {
      key: '_restoreTargetInternal',
      value: function _restoreTargetInternal(target, extraData, shouldNotPredictUrl) {
        if (!this.hasRegistration(target)) {
          return;
        }
        if (extraData.isRestored) {
          return;
        }
        extraData.isRestored = true;

        if (shouldNotPredictUrl === undefined) {
          shouldNotPredictUrl = false;
        }

        if (extraData.hasDemandWidth) {
          target.removeAttribute("data-demandjs-width");
          delete extraData.hasDemandWidth;
          delete extraData.demandWidth;
        }
        if (extraData.hasDemandHeight) {
          target.removeAttribute("data-demandjs-height");
          delete extraData.hasDemandHeight;
          delete extraData.demandHeight;
        }
        extraData.isOffloading = false;

        if (extraData.hasSrcset) {
          target.setAttribute('srcset', extraData.srcset);
        }
        if (extraData.hasSizes) {
          target.setAttribute('sizes', extraData.sizes);
        }
        if (extraData.hasSrc) {
          var src = extraData.src;
          if (!shouldNotPredictUrl) {
            src = this.predictUrl(target, src);
          }
          //target.setAttribute('crossOrigin', ''); // TODO: trying to address issue with cors violation on reload of image
          target.setAttribute('src', src);
        }
        if (extraData.children.length > 0) {
          for (var i = 0; i < extraData.children.length; i++) {
            var childData = extraData.children[i];
            this._restoreTargetInternal(childData.target, childData, shouldNotPredictUrl);
          }
        }

        if (extraData.insertToLoad) {
          this.scrollSave();

          var _resolveTarget14 = this.resolveTarget(target),
              registration = _resolveTarget14.registration;

          if (!registration) {
            throw 'unable to load element!';
          }
          var ph = registration.placeholders[0];
          var injectNode = this.selectByDemandClass(target, this.options.injectNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.injectNode);
          injectNode.call(this, target, ph, 'restoreTarget');

          this.scrollRestore();
        }

        extraData.startTime = performance.now();
      }
    }, {
      key: 'clearAttributes',
      value: function clearAttributes(target, store) {
        if (store.hasSrc) {
          target.removeAttribute('src');
        }
        if (store.hasSrcset) {
          target.removeAttribute('srcset');
        }
        if (store.hasSizes) {
          target.removeAttribute('sizes');
        }
      }
    }, {
      key: 'captureTarget',
      value: function captureTarget(target, targetRoot) {
        var _this5 = this;

        var store = {
          'target': target,
          'hasSrc': target.hasAttribute('src'),
          'src': target.getAttribute('src'),
          'hasSrcset': target.hasAttribute('srcset'),
          'srcset': target.getAttribute('srcset'),
          'hasSizes': target.hasAttribute('sizes'),
          'sizes': target.getAttribute('sizes'),
          'isLink': 'tagName' in target && target.tagName.match(/link/i),
          'insertToLoad': this.options.shouldInsertToLoad(target),
          'hasHref': target.hasAttribute('href'),
          'href': target.getAttribute('href'),
          'hasType': target.hasAttribute('type'),
          'type': target.getAttribute('type'),
          'hasDemandWidth': target.hasAttribute('data-demandjs-width'),
          'demandWidth': target.getAttribute('data-demandjs-width'),
          'hasDemandHeight': target.hasAttribute('data-demandjs-height'),
          'demandHeight': target.getAttribute('data-demandjs-height'),
          'hasDisplay': target.style && target.style.display,
          'display': target.style.display || '',
          'children': [],
          'isRestored': false,
          'shouldRestore': false,
          'canLoad': false,
          'shouldInjectLink': false,
          'listeners': [],
          'performancePrediction': {}
        };
        // The assumption is that this is the only way these attribute can be defined, somebody could potentially set these attributes manually and this would violate that assumption
        // the loading graphic should take these width / height values and use them to consume space in the layout if available
        store.isOffloading = store.hasDemandWidth || store.hasDemandHeight;
        this.clearAttributes(target, store);

        if (store.isLink && store.hasHref) {
          store.shouldInjectLink = true;
          if (!store.hasType) {
            store.type = 'text/html';
          }
        }

        // We do not care about load events of child elements
        if (('tagName' in target && target.tagName.match(/img/i) || store.hasSrc || store.hasSrcset) && target === targetRoot) {
          store.shouldRestore = true;
          store.canLoad = true;

          var listeners = [];
          if ('tagName' in target && target.tagName.match(/video|audio/i)) {
            listeners.push({
              type: 'loadedmetadata',
              listener: function listener(evt) {
                return _this5.processSuccess(targetRoot);
              }
            });
            listeners.push({
              type: 'loadeddata',
              listener: function listener(evt) {
                return _this5.processSuccess(targetRoot);
              }
            });
          } else {
            listeners.push({
              type: 'load',
              listener: function listener(evt) {
                return _this5.processSuccess(targetRoot);
              }
            });
          }

          if (store.hasSrcset && store.hasSrc) {
            listeners.push({
              type: 'error',
              listener: function listener(evt) {
                _this5.handleError(targetRoot, new Error('Loading for srcset and src failed (' + store.srcset + ')(' + store.src + ')'));
              }
            });
          } else if (store.hasSrcset) {
            listeners.push({
              type: 'error',
              listener: function listener(evt) {
                _this5.handleError(targetRoot, new Error('Loading for srcset failed (' + store.srcset + ')'));
              }
            });
          } else if (store.hasSrc) {
            listeners.push({
              type: 'error',
              listener: function listener(evt) {
                _this5.handleError(targetRoot, new Error('Loading for src failed (' + store.src + ')'));
              }
            });
          } else {
            listeners.push({
              type: 'error',
              listener: function listener(evt) {
                _this5.handleError(targetRoot, new Error('Loading srced element failed (FALLBACK ERROR MSG)'));
              }
            });
          }

          listeners.forEach(function (l) {
            return target.addEventListener(l.type, l.listener);
          });
          store.listeners = listeners;
        }

        if ('tagName' in target && target.tagName.match(/picture|video|audio/i)) {
          if (target === targetRoot) {
            store.shouldRestore = true;
          }
          for (var i = 0; i < target.children.length; i++) {
            var child = target.children[i];
            var desc = this.captureTarget(child, targetRoot);
            desc.index = i;
            store.children.push(desc);
            this.registerPlaceholder(child, child, [], desc);
          }
        }

        return store;
      }
    }, {
      key: 'getPerformanceRecord',
      value: function getPerformanceRecord(url) {
        if (!(url in this.options.urlPerformance)) {
          this.options.urlPerformance[url] = {
            predictedSpeed: 0,
            bitsPerMillisecond: [],
            currentUsage: 0
          };
        }
        return this.options.urlPerformance[url];
      }
    }, {
      key: 'getPerformanceSize',
      value: function getPerformanceSize(url, target) {
        var entries = performance.getEntriesByName(url);
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (entry.transferSize) {
            return entry.transferSize;
          }
        }

        return this._defaultFileSize(target);
      }
    }, {
      key: '_defaultFileSize',
      value: function _defaultFileSize(target) {
        return this.selectByDemandClass(target, this.options.defaultFileSize, this.options.demandClassAttribute, this.options.defaultDemandClass, 512 * 1024);
      }
    }, {
      key: '_defaultPerfSpeed',
      value: function _defaultPerfSpeed(target) {
        return this._defaultFileSize(target) / 1000;
      }
    }, {
      key: '_getFailureMultiplier',
      value: function _getFailureMultiplier() {
        return 100000;
      }
    }, {
      key: '_recordPerformance',
      value: function _recordPerformance(target, url, bitsPerMillisecond, prediction) {
        var arr = this.getPerformanceRecord(url);

        arr.bitsPerMillisecond.push(bitsPerMillisecond);

        var avg = 0;
        for (var i = 0; i < arr.bitsPerMillisecond.length; i++) {
          avg += arr.bitsPerMillisecond[i];
        }
        avg /= arr.bitsPerMillisecond.length;
        while (arr.bitsPerMillisecond.length > this.options.maxPerformanceRecords) {
          arr.bitsPerMillisecond.shift();
        }
        arr.predictedSpeed = avg;
        arr.currentUsage -= prediction;
      }
    }, {
      key: 'recordPerformance',
      value: function recordPerformance(target, failure) {
        if (!this.hasRegistration(target)) {
          return;
        }

        var _resolveTarget15 = this.resolveTarget(target),
            registration = _resolveTarget15.registration,
            target = _resolveTarget15.target;

        var ed = registration.extraData;

        var duration = ed.endTime - ed.startTime;
        if (failure) {
          duration *= this._getFailureMultiplier();
        }
        if (ed.hasSrc) {
          var url = ed.src;
          var perf = duration / this.getPerformanceSize(url);
          var prediction = registration.extraData.performancePrediction;
          this._recordPerformance(target, prediction.prefix, perf, prediction.speed);
        }
        if (ed.hasHref) {
          var url = ed.href;
          var perf = duration / this.getPerformanceSize(url);
          var prediction = registration.extraData.performancePrediction;
          this._recordPerformance(target, prediction.prefix, perf, prediction.speed);
        }
      }
    }, {
      key: 'predictUrl',
      value: function predictUrl(target, url) {
        if (!this.hasRegistration(target)) {
          return 'unknown';
        }

        var _resolveTarget16 = this.resolveTarget(target),
            registration = _resolveTarget16.registration,
            target = _resolveTarget16.target;

        var _getAlternatives = this.getAlternatives(url),
            suffix = _getAlternatives.suffix,
            alternatives = _getAlternatives.alternatives;

        var bestSpeed = this._defaultPerfSpeed(target),
            bestUsage = null,
            bestUrl = url;
        for (var i = 0; i < alternatives.length; i++) {
          var altUrl = alternatives[i];
          var perf = this.getPerformanceRecord(altUrl);
          var prediction = perf.currentUsage + perf.predictedSpeed;
          if (bestUsage === null || prediction < bestUsage) {
            bestUsage = prediction;
            bestSpeed = perf.predictedSpeed;
            bestUrl = altUrl;
          }
        }

        this.getPerformanceRecord(bestUrl).currentUsage += bestSpeed;
        if (registration && registration.extraData) {
          registration.extraData.performancePrediction = {
            prefix: bestUrl,
            speed: bestSpeed
          };
        } else {
          console.warn('unable to track perf in predictUrl with url=' + url);
        }

        return bestUrl + suffix;
      }
    }, {
      key: 'getAlternatives',
      value: function getAlternatives(url) {
        if (!(typeof url === 'string')) {
          throw 'Expected url but got ' + (typeof url === 'undefined' ? 'undefined' : _typeof(url));
        }

        for (var i = 0; i < this.options.alternatives.length; i++) {
          var altSet = this.options.alternatives[i];
          if (Array.isArray(altSet)) {
            for (var j = 0; j < altSet.length; j++) {
              var item = altSet[j];
              if (typeof item === 'string') {
                if (url.startsWith(item)) {
                  return {
                    suffix: url.substring(item.length),
                    alternatives: altSet
                  };
                }
              }
            }
          }
        }

        var idx = 0,
            cnt = 0,
            bestUrl = url,
            suffix = '';
        while (idx >= 0 && cnt < 3) {
          cnt++;
          idx = url.indexOf('/', idx + 1);
        }
        if (idx >= 0) {
          bestUrl = url.substring(0, idx);
          suffix = url.substring(idx);
        }
        return {
          suffix: suffix,
          alternatives: [bestUrl]
        };
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
      value: function observeTarget(target, oldRegistration) {
        if (this.isResourceLoaded(target)) {
          // do nothing, its already fully loaded
        } else if (this.isContextExcluded(target)) {
          // do nothing, another element should take care of it
        } else {
          if (oldRegistration !== undefined) {
            this._restoreTargetInternal(target, oldRegistration.extraData, true);
          }
          var store = this.captureTarget(target, target);

          var createLoadingNode = this.selectByDemandClass(target, this.options.createLoadingNode, this.options.demandClassAttribute, this.options.defaultDemandClass, this.createLoadingNode);
          var placeholders = createLoadingNode.call(this, target, store);
          placeholders = Array.prototype.slice.call(placeholders);

          for (var i = 0; i < placeholders.length; i++) {
            var placeholder = placeholders[i];

            var placeReg = this.registerPlaceholder(placeholder, target, placeholders, store);
            // register placeholders so if they contain media we dont try to demand load them...
            placeReg.loaded = true;

            this.scrollSave();
            target.insertAdjacentElement('beforeBegin', placeholder);
            this.scrollRestore();

            this.intersection.observe(placeholder);
          }
          var registration = this.registerPlaceholder(target, target, placeholders, store);
          this.attributeMutations.observe(target, this.attributeMutationOptions);
          if (this.options.shouldAutoLoad(target)) {
            this.beginLoad(registration);
          } else if (this.options.shouldRemove(target)) {
            if (store.insertToLoad) {
              registration.expectRemove = true;
              this.scrollSave();
              target.remove();
              this.scrollRestore();
            } else {
              target.style.display = 'none';
            }
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
        var _resolveTarget17 = this.resolveTarget(target),
            target = _resolveTarget17.target,
            registration = _resolveTarget17.registration;

        if (typeof registration !== 'undefined' && registration && registration.loaded) {
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
      var _this6 = this;

      _classCallCheck(this, DemandJS);

      this.phRegistry = new WeakMap();
      this.injecting = new WeakMap();
      this.observed = new WeakMap();
      this.queuedFuncs = [];

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
          return _this6.createLoadingNode(t);
        },
        createFailureNode: function createFailureNode(t, ex) {
          return _this6.createFailureNode(t, ex);
        },
        injectNode: function injectNode(i, t, r) {
          return _this6.injectNode(i, t, r);
        },
        shouldRemove: function shouldRemove(t) {
          return !('tagName' in t) || !t.tagName.match(/link/i);
        },
        shouldAutoLoad: function shouldAutoLoad(t) {
          return t.classList.contains('demandautoload') || t.hasAttribute('data-demand-autoload');
        },
        shouldInsertOnLoad: function shouldInsertOnLoad(t) {
          return _this6.options.shouldRemove(t);
        },
        shouldInsertToLoad: function shouldInsertToLoad(t) {
          if (!('tagName' in t)) {
            return false;
          }
          if (t.tagName.match(/iframe/i)) {
            return true;
          }

          if (t.tagName.match(/video/i)) {
            for (var ci = 0; ci < t.children.length; ci++) {
              var e = t.children[ci];
              if ('tagName' in e && e.tagName.match(/source/i)) {
                return true;
              }
            }
          }

          return false;
        },
        selector: 'img,video,picture,iframe,link.demand',
        ignoreSelector: '.nodemand',
        rootMargin: '256px',
        threshold: 0.001,
        rootMarginOuter: '2048px',
        thresholdOuter: 0.001,
        enableOffloading: false,
        onLoadBegin: function onLoadBegin(t) {
          return _this6.onLoadBegin(t);
        },
        onLoadSuccess: function onLoadSuccess(t) {
          return _this6.onLoadSuccess(t);
        },
        onLoadFailure: function onLoadFailure(t, e) {
          return _this6.onLoadFailure(t, e);
        },
        onLoadComplete: function onLoadComplete(t) {
          return _this6.onLoadComplete(t);
        },
        alternatives: [],
        urlPerformance: {},
        defaultFileSize: 1024 * 512, // 512KB
        maxPerformanceRecords: 7,
        retryOnError: true,
        maxRetries: 2,
        emptyImageUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',

        linkHandler: {
          'text/html': function textHtml(t, c) {
            return _this6.injectHtml(t, c);
          },
          'application/xhtml+xml': function applicationXhtmlXml(t, c) {
            return _this6.injectHtml(t, c);
          }
        }
      }, options);
      this.options.linkHandler = Object.assign(this.options.linkHandler, newHandlers);

      this.mutation = new MutationObserver(function (a, b) {
        return _this6.observeMutation(a, b);
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
        return _this6.observeIntersection(a, b);
      }, this.intersectionOptions);

      if (this.options.enableOffloading) {
        this.outersectionOptions = {
          root: null,
          rootMargin: this.options.rootMarginOuter,
          threshold: this.options.thresholdOuter
        };
        this.outersection = new IntersectionObserver(function (a, b) {
          return _this6.observeOutersection(a, b);
        }, this.outersectionOptions);
      }

      this.attributeMutations = new MutationObserver(function (a, b) {
        return _this6.observeAttributeMutation(a, b);
      });
      this.attributeMutationOptions = {
        attributes: true,
        attributeFilter: ['src', 'href', 'srcset', 'sizes', 'type'],
        attributeOldValue: false
      };

      var targets = this.queryTargets();
      this.observeTargets(targets);
      this.mutation.observe(document.body, this.mutationOptions);
    }

    return DemandJS;
  }();

  return DemandJS;
});
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

//# sourceMappingURL=demand.js.map