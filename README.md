# DemandJS
![logo](logo_transparent.png)

## Version

0.0.4 - this is still a pre-release / in development version but it is fairly functional, if you're brave enough

## Overview

DemandJS provides lazy loading of resources as they scroll into view using true progressive enhancement and the latest browser features. DemandJS works with most elements using a src attribute including images, videos, and there is extra support for embedding external content of all types, and especially html files. DemandJS uses the latest (2017) of modern browser features and aims to be as efficient and lightweight as possible. For older browser compatibility, you can polyfill features to reach your target audience.

Loading resources on demand can drastically reduce initial page load times and perceived page performance.

## Usage

To get up and running with demandJS you simply import the file into your page and instantiate it:

```javascript
window.DemandJSDemanded = new DemandJS();
```

the default options will capture all img, video, picture, iframe in the page, cancel anything that may have been loading already, replace those elements with a boilerplate loading text, and then load those resources when they are actually needed

```html
<img src="myImage.jpg" />
<video src="myVideo.mp4" />
<iframe src="iframeContent.html" />
```

the default options will also capture link tags with a class of 'demand'. A link marked with demand class and referencing .html pages will cause the browser to fetch the contents of that html page and inject it into the page at the place where the link element is placed

```html
<link rel="prefetch" class="demand" href="otherPage.html" type="text/html" />
```

DemandJS monitors the DOM for changes and any matching elements added to the page will automatically be captured and handled in the same way as elements that were already on the page. This means that all of your dynamic UI will automatically be configured to load on demand as well.

## Progressive Enhancement

DemandJS expects to find a page with standard html elements, using standard html attributes. If javascript is disabled in your users browser, they will see the exact same page, albeit with all of the images loaded at the beginning. 

## High-Dpi (Retina) and Multi-serving
Retina support is accomplished with the srcset attribute on img or picture elements and the `x` specifier for pixel density. This is a standardized browser featuer at this point:

`<img src='nonRetina.jpg' srcset='nonRetina.jpg 1x, retina2x.jpg 2x' />`

On any old browsers the page will load and use the `nonRetina.jpg` from the `src` attribute. On low-dpi screens the browser will use the `nonRetina.jpg 1x` option, and on high-dpi displays `retina2x.jpg 2x` will be used instead. DemandJS integrates seamlessly with these attributes to trigger the appropriate image loading logic of the browser.

Multi-Serving is also available in modern browsers (and supported by DemandJS) using `srcset`. In this case using the `w` to indicate image width, instead of the `x` specifier.

`<img src='fullRes.jpg' srcset='lowRes.jpg 200w, mediumRes.jpg 800w, fullRes.jpg 1200w' />`

On old browsers the src attribute will be used, on new browsers, the src attribute will be ignored and one of the 3 different resolution images will be displayed instead, all chosen automatically by the browser.

Theres a multitude of other options for multi-serving images using `picture`, `srcset`, `sizes`, `sources` that are all supported by DemandJS through progressive enhancement.

Reference: 
  * https://html.spec.whatwg.org/multipage/images.html
  * http://w3c.github.io/html/semantics-embedded-content.html#element-attrdef-img-srcset

## Embedded Content
DemandJS supports embedding external content of *any* type through the `linkHandler` option. Link handlers are keyed on a mime type, and implement custom functionality to process an external file fetched through ajax.

DemandJS comes with a single built-in link handler that accepts both `text/html` and `application/xhtml+xml` mime types. Such content will be loaded / parsed / and inserted into the DOM at the point it is defined through an appropriate link element:

```html
<link rel="prefetch" class="demand" href="externalPage1.html" type="text/html" />
<link rel="prefetch" class="demand" href="externalPage2.html" type="application/xhtml+xml" />
```

DemandJS will lazy load both externalPage1.html and externalPage2.html as they are scrolled into the viewport by the user. These link elements are by default not displayed to the user, and so will not be removed from the DOM (which is different from how img elements are handled). A loading indicator is inserted into the DOM immediately adjacent to the link element, and adheres to the rules of the `createLoadingNode` and other loading indicator options.

 * Using `rel="prefetch"` is optional but queues the browser that the content specified in the href may be requested and the browser can preemptively load it if it has extra cycles. There are numerous other standardized values for the `rel` attribute that may be applicable depending on your situation.
 * Using `class="demand"` is a convention of the default DemandJS options and completely different selectors and/or classnames could be used if desired.
 * Using `type="text/html"` or `type="application/xhtml+xml"` is optional but encouraged. DemandJS will automatically treat link elements with no type attribute as `type="text/html"`.

It is possible to produce custom link handlers for other mime types, or even override the built-in link handler as needed. The [DemandJS Homepage](index.html) for example, defines a custom handler for `type="text/markdown"` to fetch and render `README.md` using a javascript markdown renderer.

```javascript
    var showdownConverter = new showdown.Converter();
    showdownConverter.setFlavor('github');
      var options = {
        linkHandler: {
          'text/markdown': function (t,c) {
            var html = showdownConverter.makeHtml(c);
            var content = document.createElement('div');
            content.innerHTML = html;
            while (content.children.length > 0) {
              t.parentNode.insertBefore(content.children[0], t);
            }
          }
        }
      };
      window.DemandJSDemanded = new DemandJS(options);
```

A couple of points to notice about this code:

  * DemandJS handles all the work of fetching the remote content, the extension code receives the fully loaded resource (passed via the argument `c`) and needs to simply insert it into the DOM.
  * DemandJS pasess the associated `link` element in the argument `t`, and it is expected that the new content is inserted into the DOM relative to the position of that link element.
  * All standard event handlers will be invoked as usual, and are not something tha needs to be addressed by the extension code.
  * It is entirely possible to trigger additional asynchronous behaviors from the extension code via `setTimeout()` or similar, however there is no facility in place within DemandJS to delay completion events or intercept error messages that might occur from downstream async code. (This functionality may become available in the future to extensions that return a promise)

Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types

## Error Handling
Errors during resource loading are reported and handled by default through the ```failureHtml``` property by removing the content
that failed to load, and replacing it with a html element with a bright red background and white text ```ERROR```. This
content can be configured by setting the ```failureHtml``` property on the options.

A simple customization is shown below:
 ([see test009](test/test009.html))

```javascript
var options = {
  failureHtml: "<div class='errorMessage'>Loading Failed!</div>"
};
window.DemandJSDemanded = new DemandJS(options);
```

Errors can can be captured and handled by passing a custom function as ```createFailureNode``` in the options object. This function is expected to return a collection of one or more html element objects to be inserted (but not yet inserted) into the document. These elements will be inserted at the place where the failed content was located. This function will be invoked with this set to the DemandJS object and using this.createFailureNode() will fallback to the default implementation.

A simple customization is shown below:
 ([see test010](test/test010.html))

```javascript
var options = {
  createFailureNode: function(target,error) {
    if (target.classList.contains('showErrorMessage')) {
      var result = document.createElement('div');
      result.innerHTML = '<div class="errorMessage">Loading failed with error: </div>';
      result.children[0].appendChild(document.createTextNode(error.message));
      return result.children;
    } else {
      return this.createFailureNode();
    }
  }
};
window.DemandJSDemanded = new DemandJS(options);
```

Errors can also be captured and handled by passing a custom function as ```onLoadError``` in the options object. This function is expected to do any dom modifications directly as needed. This is the most robust way of configuring error handling, but also comes with the greatest responsibility. Be sure to remove the target node (if you don't want it to be shown in the page).

The default implementation is shown below (whic is written using ES6 code:

```javascript
var options = {
	onLoadFailure: function(target, ex){                                                                                                        
		var errorUI = this.options.createFailureNode.call(this, target, ex);
		errorUI = Array.prototype.slice.call(errorUI);
		for (var eui of errorUI) {
			target.parentNode.insertBefore(eui, target);
		}
		if (this.options.shouldRemove(target)) {
			target.parentNode.removeChild(target);
		}
	}
};
window.DemandJSDemanded = new DemandJS(options);
```

a simple overload that displays an alert box when each error occurrs (but also performs the built-in functionality) might look as follows:
 ([see test011](test/test011.html))

```javascript
var options = {
	onLoadFailure: function(target, ex){                                                                                                        
    alert(ex.message);
    this.onLoadFailure(target, ex);
  }
};
window.DemandJSDemanded = new DemandJS(options);
```
## Configuration

  The DemandJS constructor accepts a single argument, which is the options collection. 

  | Field                  | Description | Default |
  |------------------------|-------------|---------|
  | loadingHtml            | This option controls the Html injected into the page while elements are loading. This is the easiest way to configure the loading indicator UI | `<div style="width:100%;height:100%">Loading In Progress</div>` |
  | createLoadingNode      | This is a function, invoked each time loading UI must be created. It is passed one argument, the html element that is being replaced. In case the loadingHtml option isn't robust enough, you can overlaod this function to have full control over the loading UI being injected into the page. This function should return a collection of htmlElement nodes that can be inserted into the DOM. | Defined as a functor to creating the `loadingHtml` specified |
  | failureHtml             | This option controls the Html injected into the page when loading fails. This is the easy way to configure a special UI for error messages | `<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>` |
  | createFailureNode     | This is a function, invoked each time loading fails, and error  UI must be created. It is passed two arguments, the first is the html element that has failed. The second is a non-standard (and possibly undefined) error detail, which could possibly be an exception, a generic message, or again undefined. In case the failureHtml option isn't robust enough, you can overlaod this function to have full control over the loading UI being injected into the page. This function should return a collection of htmlElement nodes that can be inserted into the DOM. | Defines a functor to creating the `failureHtml` |
  | selector             | This is a css selector, defining which elements should be matched and processed. You can change this to include additional elements, or limit the elements being procssed to a subset of the entire page. | `img,video,picture,iframe,link.demand` |
  | rootMargin           | This defines the margin around the viewport that is considered 'in-view'. Can have values similar to the CSS margin property e.g. `10px 20px 30px 40px` | `48px` |
  | threshold            | Defines the percentage between 0 (any %) and 1 (100%) the placeholder element must be visible before the image begins loading. The intersection observer API supports multiple threshold levels, however DemandJS only is going to do anything meaningful with the lowest specified threshold. Actual loading is also affected by the `rootMargin` property as well. | `0` |
  | onLoadBegin            | `function(target) {}` - this is called each time an element begins loading, the element is passed as an argument  | noop |
  | onLoadSuccess              | `function(target) {}` - this is called each time an element completes loading, the element is passed as an argument  | noop |
  | onLoadFailure              | `function(target, exception) {}` - this is called each time loading fails with error, the element that was loading is passed as the argument 'target'. 'exception' details which will be of type Error.  | noop |
  | onLoadComplete              | `function(target) {}` - this is called each time loading completes, both for error and success, the element is passed as an argument  | noop |
  | linkHandler                 | this is a collection of (key,value) pairs where key is a mime-type (string) and value is a function (target, content) to be invoked when a link element with `type="(contentType)"` is loaded | handlers for mime types `text/html` and `application/xhtml+xml` are available by default |


## Polyfill Dependencies
You will need to polyfill any essential components if you want to use this library. There are some additional optional
polyfills that are only required for specific features.

* WeakMap - essential
* IntersectionObserver  - essential
* MutationObserver - essential
* HTMLElement.matches - essential (IE8/IE9 only?)
* fetch - currently only required when fetching links
* promise - currently only required when fetchign links


## Build Dependencies

dotnet core 2.0 is being used for builds - demandjs.csproj defines all the automation, a sln file is also included

the build depends on several javascript precompilers to transpile to es5 (babel) and minify (closure)

npm install --save-dev babel-cli babel-preset-env
npm install --save-dev google-closure-compiler

demandjs.debug.js - we build a debug version of the library using babel only, which creates a valid source map to the original source code and transpiles to ES5.

demandjs.min.js - we build a release version of the library by first transpiling with babel and then minifying / optimizing with closure

## Testing

there are a number of test cases setup in the tests/ subfolder of this project. These test cases cover scenarios that this library is intended to work properly

assertions are non-existent in these tests. For each browser you have to manually inspec the results of the page to determine whether or not the code is functioning as intended. This is suboptimal hwoever it is the case for the time being.

Additional test cases are welcome, and without assertions, it should be pretty easy to create simple examples of use cases you care about. Please use the imagelist.js file (also in the tests folder) to get at urls of images instead of hardcoding links to random places on the internet.

It should be fairly easy to make assertions using some combination of properties like img.complete / video.buffered and window.scrollTo  for some test cases. The Resource Timing API (https://www.w3.org/TR/resource-timing/) or whatever comes of this proposed technology might also be a resonable choice for implementing assertions in the future, but compatibility would be very limited without polyfills in the short term.

### Test Index
 * [test001](test/test001.html)
 * [test002](test/test002.html)
 * [test003](test/test003.html)
 * [test003_error](test/test003_error.html)
 * [test004](test/test004.html)
 * [test005](test/test005.html)
 * [test005_error](test/test005_error.html)
 * [test006](test/test006.html)
 * [test007](test/test007.html)
 * [test008](test/test008.html)
 * [test009](test/test009.html)
 * [test010](test/test010.html)
 * [test011](test/test011.html)

## Release Notes 

* 0.0.4 - error handling fleshed out and tested
* 0.0.3 - added 'linkHandler' option and more documentation improvements
* 0.0.2 - added support for srcset attribute, picture elements, and more advanced usages of video (audio) that embed source elements as opposed to using direct src fields
* 0.0.2 - add support for picture elementsmedia
* 0.0.2 -  support advance video (audio) that use source elements and embedded html as opposed to using the src attribute
* 0.0.1 - Initial Version, supports img / iframe / video / link type=text/html
