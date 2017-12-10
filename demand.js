(function (ctx) {
  class DemandJS {
    observeMutation(mutations) {
      for (var mutation of mutations) {
        if (mutation.type !== 'childList') { continue; }
        for (var added of mutation.addedNodes) {
          if (this.isTargetMatch(added)) {
            this.observeTarget(added);
          }
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
        this.options.onLoadBegin(target);
        fetch(url).then(function (response) {
          if (!response.ok) {
            throw Error(response.status + '_' + response.statusText);
          }
          return response.text();
        }).then(txt=>{
          this.injectLink(registration, txt);
        }).catch(ex=>{
          this.onLoadError(registration, ex);
        });
      } else if (registration.extraData.shouldRestore) {
        // setTimeout helps keep loading animations smooth
        setTimeout(()=>this.restoreTarget(registration), 0);
      } else {
        throw 'Unknown load operation';
      }
    }
    isLoaded(target) {
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
      this.onLoadComplete(registration);
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
      let scriptId = 1;
      for (var body of bodies) {
        for (var bc of body.children) {
          if ('tagName' in bc && bc.tagName.match(/script/i)) {
            let localScriptId = scriptId;
            scriptId += 1;
            let codePromise = Promise.resolve(bc.innerHTML);
            if ('src' in bc && !(!(bc.src))) {
              codePromise = fetch(bc.src).then(response=>{
                if (!response.ok) {
                  throw Error(response.status + '_' + response.statusText);
                }
                return response.text();
              }); 
            }
            codePromise.then(code=>{
              this.injectScript(target, target.href + '.inline[' + localScriptId + '].js', code);
            });
          } else {
            target.parentNode.insertBefore(bc, target);
          }
        }
      }
    }
    onLoadComplete(target) {
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
      this.options.onLoadEnd(target);
      this.options.onLoadComplete(target);
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
    onLoadError(target, evt) {
      var {target, registration} = this.resolveTarget(target);
      let first = true;
      for (var placeholder of registration.placeholders) {
        if (first) {
          first = false;
          var errorUI = this.options.createErrorNode(registration.target);
          for (var eui of errorUI) {
            placeholder.parentNode.insertBefore(eui, placeholder);
          }
        }
        this.cleanupPlaceholder(placeholder);
      }

      this.cleanupRegistrationTarget(registration);
      this.options.onLoadError(target);
      this.options.onLoadComplete(target);
    }
    createErrorNode() {
      var ele = document.createElement('div');
      ele.innerHTML = this.options.errorHtml;
      return Array.prototype.slice.call(ele.childNodes);
    }
    createPlaceholder() {
      var ele = document.createElement('div');
      ele.innerHTML = this.options.pendingHtml;
      return Array.prototype.slice.call(ele.childNodes);
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
      this.options.onLoadBegin(target);

      this._restoreTargetInternal(target, extraData);

      if (!extraData.canLoad) {
        this.onLoadComplete(registration);
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
        target.addEventListener('load', evt=>this.onLoadComplete(targetRoot));
        target.addEventListener('error', evt=>this.onLoadError(targetRoot, evt));
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
      if (this.isLoaded(target)) {
        // do nothing, its already fully loaded
      } else if (this.isContextExcluded(target)) { 
        // do nothing, another element should take care of it
      } else {
        var store = this.captureTarget(target, target);
        var placeholders = this.options.createPlaceholder(target);
        for (var placeholder of placeholders) {
          this.registerPlaceholder(placeholder, target, placeholders, store);
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
    isTargetMatch(target) {
      if (this.loaded.has(target)) { return false; }
      return 'matches' in target && target.matches(this.options.selector);
    }
    queryTargets() {
      let result = [];
      for (var node of document.querySelectorAll(this.options.selector)) {
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

      let newHandlers = {};
      if (options && 'linkHandler' in options) {
        newHandlers = options.linkHandler;
        delete options.linkHandler;
      }
      this.options = Object.assign({
        pendingHtml: '<div style="width:100%;height:100%">Loading In Progress</div>',
        errorHtml: '<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>',
        createPlaceholder: t=>this.createPlaceholder(),
        createErrorNode: t=>this.createErrorNode(),
        shouldRemove: t=>!('tagName' in t) || !(t.tagName.match(/link/i)),
        shouldInsertOnLoad: t=>this.options.shouldRemove(t),
        selector: 'img,video,picture,iframe,link.demand',
        rootMargin: '48px',
        threshold: 0,
        onLoadBegin: t=>{},
        onLoadEnd: t=>{},
        onLoadError: t=>{},
        onLoadComplete: t=>{},
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
