/** @preserve DemandJS - v.1.0.0-rc.3 
 *
 * https://github.com/hannasm/demandjs  
 *
 **/
(function (ctx) {
  class DemandJS {
    observeMutation(mutations) {
      for (var mutation of mutations) {
        if (mutation.type !== 'childList') { continue; }
        for (var added of mutation.addedNodes) {
          this.checkAdditionRecursive(added);
        }
      }
    }
    checkAdditionRecursive(added) {
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

      if(added.children) {
        for (var child of added.children) {
          this.checkAdditionRecursive(child);
        }
      }
    }
    observeIntersection(intersections) {
      for (var intersect of intersections) {
        if (!intersect.isIntersecting) { continue; }
        let reg = this.phRegistry.get(intersect.target);
        if (reg === undefined || reg.loading) { continue; }
        reg.loading = true;
        this.beginLoad(reg);   
      }
    }
    beginLoad(target) {
      var {target, registration} = this.resolveTarget(target);
      if (registration.extraData.shouldInjectLink) {
        let url = registration.extraData.href;

        let onLoadBegin = this.selectByDemandClass(
            target, this.options.onLoadBegin,
            this.options.demandClassAttribute,
            this.options.defaultDemandClass,
            this.onLoadBegin);
        onLoadBegin.call(this, target);

        fetch(url).then(function (response) {
          if (!response.ok) {
            var error = new Error('Fetching "' + url + '" failed with ' + response.status + ' ' + response.statusText);
            error.responseDetail = response;
            throw error;
          }
          return response.text();
        }).then(txt=>{
          this.injectLink(registration, txt);
        }).catch(ex=>{
          this.handleError(registration, ex);
        });
      } else if (registration.extraData.shouldRestore) {
        // setTimeout helps keep loading animations smooth
        setTimeout(()=>this.restoreTarget(registration), 0);
      } else {
        throw 'Unknown load operation';
      }
    }
    isResourceLoaded(target) {
      return target.complete || false;
    }
    injectLink(target, txt) {
      var {target, registration} = this.resolveTarget(target);
      var type = registration.extraData.type;
      if (type in this.options.linkHandler) {
        var handler = this.options.linkHandler[type];
        handler(target, txt);
      } else {
        throw 'Unknown link demand with content type: ' + type;
      }
      this.processSuccess(registration);
    }
    injectedScript(bc, injecting) {
      let localScriptId = injecting.id;
      let codePromise = Promise.resolve(bc.innerHTML);
      if ('src' in bc && !(!(bc.src))) {
        codePromise = fetch(bc.src).then(response=>{
          if (!response.ok) {
            throw Error(response.status + '_' + response.statusText);
          }
          return response.text();
        });
        localScriptId = bc.src + '#' + localScriptId;
      }
      codePromise.then(code=>{
        this.injectScript(bc, injecting.href + '.demand[' + localScriptId + '].js', code);
      });
    }
    injectScript(target, id, code) {
      var oldDw = document.write;
      var content = '';
      document.write = c=>content += c;

      var codeToExecute = new Function(code + "\n" + '//@ sourceURL=' + id);
      codeToExecute();
     
      if (content !== '') { 
        this.injectHtml(target, '<body>' + content + '</body>');
      }

      document.write = oldDw;
    }
    injectHtml(target, txt) {
      var root = document.createElement('html');
      root.innerHTML = txt;
      var bodies = root.getElementsByTagName('body');
      let injectionId = 1;
      bodies = Array.prototype.slice.call(bodies);
      for (var body of bodies) {
        var clds = Array.prototype.slice.call(body.children);
        for (var bc of clds) {
          this.injecting.set(bc, {
            href: target.href,
            id: injectionId 
          });
          injectionId += 1;
          target.parentNode.insertBefore(bc, target);
        }
      }
    }
    processSuccess(target) {
      var {target, registration} = this.resolveTarget(target);
      let first = this.options.shouldInsertOnLoad(registration.target);
      for (var placeholder of registration.placeholders) {
        if (first) {
          first = false;
          placeholder.parentNode.insertBefore(registration.target, placeholder);
        }
        this.cleanupPlaceholder(placeholder);
      }
      this.cleanupRegistrationTarget(registration);

      let onLoadSuccess = this.selectByDemandClass(
          target, this.options.onLoadSuccess,
          this.options.demandClassAttribute,
          this.options.defaultDemandClass,
          this.onLoadSuccess);
      onLoadSuccess.call(this, target);
      let onLoadComplete = this.selectByDemandClass(
          target, this.options.onLoadComplete,
          this.options.demandClassAttribute,
          this.options.defaultDemandClass,
          this.onLoadComplete);
      onLoadComplete.call(this, target);
    }
    cleanupPlaceholder(placeholder) {
        this.intersection.unobserve(placeholder);
        placeholder.parentNode.removeChild(placeholder);
        this.phRegistry.delete(placeholder);
    }
    cleanupRegistrationTarget(registration) {
      this.intersection.unobserve(registration.target); // this only necesarry when we didnt remove the item
      this.phRegistry.delete(registration.target);
      this.loaded.set(registration.target, true);
    }
    handleError(target, ex) {
      var {target, registration} = this.resolveTarget(target);
      if (!(ex && ex.stack && ex.message))  {
        if (!ex) {
          ex = new Error("No error was provided on load");
        } else {
          ex = new Error(ex);
        }
      }
      let onLoadFailure = this.selectByDemandClass(
          target, this.options.onLoadFailure,
          this.options.demandClassAttribute,
          this.options.defaultDemandClass,
          this.onLoadFailure);

      let first = true;
      for (var placeholder of registration.placeholders) {
        if (first) {
          first = false;
          
          if (!target.parentNode) {
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
      let onLoadComplete = this.selectByDemandClass(
          target, this.options.onLoadComplete,
          this.options.demandClassAttribute,
          this.options.defaultDemandClass,
          this.onLoadComplete);
      onLoadComplete.call(this, target);
    }
    onLoadBegin(t) {
      //  nothing to do here
    }
    onLoadSuccess(target) {
      //  nothing to do here
    }
    onLoadComplete(target) {
      //  nothing to do here
    }
    onLoadFailure(target, ex) {
        var createFailureNode = this.selectByDemandClass(
            target, this.options.createFailureNode,
            this.options.demandClassAttribute,
            this.options.defaultDemandClass,
            this.createFailureNode);
        var errorUI = createFailureNode.call(this, target, ex);
        errorUI = Array.prototype.slice.call(errorUI);
        for (var eui of errorUI) {
          // register placeholders so if they contain media we dont try to demand load them...
          this.loaded.set(eui, true); 

          target.parentNode.insertBefore(eui, target);
        }
        if (this.options.shouldRemove(target)) {
          target.parentNode.removeChild(target);
        }
    }
    selectByDemandClass(t, data, attr, defaultKey, defaultData) {
      if (!data) { return defaultData; }
      if (typeof data === 'object') {
        let key = defaultKey;
        if (t.hasAttribute(attr)) { key = t.getAttribute(attr); }
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
    createFailureNode(t,ex) {
      var ele = document.createElement('div');

      let html = this.selectByDemandClass(t, 
          this.options.failureHtml, 
          this.options.demandClassAttribute, 
          this.options.defaultDemandClass, 
          this.defaultFailureHtml);
      ele.innerHTML = html;

      return ele.childNodes;
    }
    createLoadingNode(t) {
      var ele = document.createElement('div');
      
      let html = this.selectByDemandClass(t, 
          this.options.loadingHtml, 
          this.options.demandClassAttribute, 
          this.options.defaultDemandClass, 
          this.defaultLoadingHtml);
      ele.innerHTML = html;

      return ele.childNodes;
    }
    registerPlaceholder(node, target, placeholders, extraData) {
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
    resolveTarget(target) {
      var registration = target;
      if (!('isRegistration' in target) || !(target.isRegistration)) {
        registration = this.phRegistry.get(target);
      } else { 
        target = registration.target;
      }
      return {
        target: target,
        registration: registration
      };
    }
    restoreTarget(target) {
      var {target, registration} = this.resolveTarget(target);
      var extraData = registration.extraData;
      registration.loading = true;

      let onLoadBegin = this.selectByDemandClass(
          target, this.options.onLoadBegin,
          this.options.demandClassAttribute,
          this.options.defaultDemandClass,
          this.onLoadBegin);
      onLoadBegin.call(this, target);

      this._restoreTargetInternal(target, extraData);

      if (!extraData.canLoad) {
        this.processSuccess(registration);
      }
    }
    _restoreTargetInternal(target, extraData) {
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
    captureTarget(target, targetRoot) {
      var store = {
        'target': target,
        'hasSrc':  target.hasAttribute('src'),
        'src':  target.getAttribute('src'),
        'hasSrcset': target.hasAttribute('srcset'),
        'srcset': target.getAttribute('srcset'),
        'hasSizes': target.hasAttribute('sizes'),
        'sizes': target.getAttribute('sizes'),
        'isLink': ('tagName' in target) && (target.tagName.match(/link/i)),
        'hasHref': target.hasAttribute('href'),
        'href': target.getAttribute('href'),
        'hasType': target.hasAttribute('type'),
        'type': target.getAttribute('type'),
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
        target.addEventListener('load', evt=>this.processSuccess(targetRoot));

        if (store.hasSrcset && store.hasSrc) {
          target.addEventListener('error', evt=>{
            this.handleError(targetRoot, new Error('Loading for srcset and src failed (' + store.srcset + ')(' + store.src + ')'))
          });
        } else if (store.hasSrcset) {
          target.addEventListener('error', evt=>{
            this.handleError(targetRoot, new Error('Loading for srcset failed (' + store.srcset + ')'))
          });
        } else if (store.hasSrc) {
          target.addEventListener('error', evt=>{
            this.handleError(targetRoot, new Error('Loading for src failed (' + store.src + ')'))
          });
        } else {
          target.addEventListener('error', evt=>{
            this.handleError(targetRoot, new Error('Loading srced element failed (FALLBACK ERROR MSG)'))
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
    isContextExcluded(target) {
      if (!target) { return false; }
      if (!('parentNode' in target)) { return false; }
      var parent = target.parentNode;
      if (!parent) { return false; }
      if (!('tagName' in parent)) { return false; }
      if (parent.tagName.match(/picture|video|audio/i)) { return true; }

      // need to recurse up for cases like video with embedded html as a fallback
      return this.isContextExcluded(parent);
    }
    observeTarget(target) {
      if (this.isResourceLoaded(target)) {
        // do nothing, its already fully loaded
      } else if (this.isContextExcluded(target)) { 
        // do nothing, another element should take care of it
      } else {
        var store = this.captureTarget(target, target);

        var createLoadingNode = this.selectByDemandClass(
            target, this.options.createLoadingNode,
            this.options.demandClassAttribute,
            this.options.defaultDemandClass,
            this.createLoadingNode);
        var placeholders = createLoadingNode.call(this, target);
        placeholders = Array.prototype.slice.call(placeholders);

        for (var placeholder of placeholders) {
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
    observeTargets(targets) {
      for (var target of targets) {
        this.observeTarget(target);
      }
    }
    isLoadedRecursive(target, injecting) {
      if (this.loaded.has(target)) { return { loaded: true, injecting: injecting || this.injecting.get(target) }; }
      // we cant be injecting an element and loading it simultaneously
      if (!injecting && target.parentNode) {
       return this.isLoadedRecursive(target.parentNode, injecting || this.injecting.get(target));
      }
     return { loaded: false, injecting: injecting || this.injecting.get(target) };
    }
    isScript(bc) {
      return !!('tagName' in bc && bc.tagName.match(/^script$/i));
    }
    isTargetMatch(target) {
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
    queryTargets() {
      let result = [];
      for (var node of document.querySelectorAll(this.options.selector)) {
        if (this.options.ignoreSelector && 'matches' in node && node.matches(this.options.ignoreSelector)) { continue; }
        result.push(node);
      }
      return result;
    }
    shouldRemove(t) {
      return !('tagName' in t) || !(t.tagName.match(/link/i)); 
    }
    constructor(options) {
      this.phRegistry = new WeakMap();
      this.loaded = new WeakMap();
      this.injecting = new WeakMap();

      let newHandlers = {};
      if (options && 'linkHandler' in options) {
        newHandlers = options.linkHandler;
        delete options.linkHandler;
      }

      this.defaultLoadingHtml = '<div style="width:100%;height:100%">Loading In Progress</div>';
      this.defaultFailureHtml = '<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>';

      this.options = Object.assign({
        demandClassAttribute: 'data-demand',
        defaultDemandClass: 'default',
        loadingHtml: this.defaultLoadingHtml,
        failureHtml: this.defaultFailureHtml,
        createLoadingNode: t=>this.createLoadingNode(t),
        createFailureNode: (t,ex)=>this.createFailureNode(t, ex),
        shouldRemove: t=>!('tagName' in t) || !(t.tagName.match(/link/i)),
        shouldInsertOnLoad: t=>this.options.shouldRemove(t),
        selector: 'img,video,picture,iframe,link.demand',
        ignoreSelector: '.nodemand',
        rootMargin: '48px',
        threshold: 0,
        onLoadBegin: t=>this.onLoadBegin(t),
        onLoadSuccess: t=>this.onLoadSuccess(t),
        onLoadFailure: (t,e)=>this.onLoadFailure(t,e),
        onLoadComplete: t=>this.onLoadComplete(t),
        linkHandler: {
          'text/html': (t,c)=>this.injectHtml(t,c),
          'application/xhtml+xml': (t,c)=>this.injectHtml(t,c)
        }
      }, options);
      this.options.linkHandler = Object.assign(this.options.linkHandler, newHandlers);

      this.mutation = new MutationObserver((a,b)=>this.observeMutation(a,b));
      this.mutationOptions = {
        childList: true,
        subtree: true
      };

      this.intersectionOptions = {
        root: null,
        rootMargin:this.options.rootMargin,
        threshold:this.options.threshold 
      };
      this.intersection = new IntersectionObserver( (a,b)=>this.observeIntersection(a,b), this.intersectionOptions);

      this.observeTargets(this.queryTargets());
      this.mutation.observe(document.body, this.mutationOptions);
    }
  }

  window.DemandJS = DemandJS;
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
