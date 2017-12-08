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
    beginLoad(registration) {
      if (registration.extraData.isLink &&
          registration.extraData.hasHref) {
        let url = registration.extraData.href;
        fetch(url).then(function (response) {
          if (!response.ok) {
            throw Error(response.status + '_' + response.statusText);
          }
          return response.text();
        }).then(txt=>{
          this.injectLink(registration.target, txt);
        }).catch(ex=>{
          this.onLoadError(registration, ex);
        });
      } else if (registration.extraData.hasSrc) {
        registration.target.addEventListener('load', evt=>this.onLoadComplete(registration));
        registration.target.addEventListener('error', evt=>this.onLoadError(registration, evt));
        // setTimeout helps here helps keep loading animations smooth
        setTimeout(()=>registration.target.setAttribute('src', registration.extraData.src), 0);
      } else {
        throw 'Unknown load operation';
      }
    }
    isLoaded(target) {
      return target.complete || false;
    }
    injectLink(target, txt) {
      if (target.href.match(/\.html$/i)) {
        let reg = this.phRegistry.get(target);
        this.injectHtml(target, txt);
        this.onLoadComplete(reg);
      } else {
        throw Error('Not implemented link injection with url ' + target.href);
      }
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
    onLoadComplete(registration) {
      let first = this.options.shouldInsertOnLoad(registration.target);
      for (var placeholder of registration.placeholders) {
        if (first) {
          first = false;
          placeholder.parentNode.insertBefore(registration.target, placeholder);
        }
        this.cleanupPlaceholder(placeholder);
      }
      this.cleanupRegistrationTarget(registration);
    }
    cleanupPlaceholder(placeholder) {
        this.intersection.unobserve(placeholder);
        placeholder.parentNode.removeChild(placeholder);
        this.phRegistry.delete(placeholder);
    }
    cleanupRegistrationTarget(registration) {
      this.intersection.unobserve(registration.target); // this only necesarry when we didnt remove the item
      this.phRegistry.delete(registration.target);
    }
    onLoadError(registration, evt) {
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
    }
    createErrorNode() {
      var ele = document.createElement('div');
      ele.innerHTML = this.options.errorHTML;
      return Array.prototype.slice.call(ele.childNodes);
    }
    createPlaceholder() {
      var ele = document.createElement('div');
      ele.innerHTML = this.options.pendingHTML;
      return Array.prototype.slice.call(ele.childNodes);
    }
    registerPlaceholder(node, target, placeholders, extraData) {
      this.phRegistry.set(node, {
        target: target,
        node: node,
        placeholders: placeholders,
        extraData: extraData,
        loading: false
      });
    }
    observeTarget(target) {
      if (this.isLoaded(target)) {
        
      } else {
        var store = {
          'hasSrc':  target.hasAttribute('src'),
          'src':  target.getAttribute('src'),
          'isLink': ('tagName' in target) && (target.tagName.match(/link/i)),
          'hasHref': target.hasAttribute('href'),
          'href': target.getAttribute('href')
        };
        if (store.hasSrc) {
          target.removeAttribute('src');
        }
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
      this.options = Object.assign({
        pendingHTML: '<div style="width:100%;height:100%">Loading In Progress</div>',
        errorHTML: '<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>',
        createPlaceholder: t=>this.createPlaceholder(),
        createErrorNode: t=>this.createErrorNode(),
        shouldRemove: t=>!('tagName' in t) || !(t.tagName.match(/link/i)),
        shouldInsertOnLoad: t=>this.options.shouldRemove(t),
        selector: 'img,video,iframe,link.demand',
        rootMargin: '48px',
        threshold: 0
      }, options);
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
