# DemandJS
![logo](logo_transparent.png)

## Version

1.0.0-rc.2 - we have reached a point where the intended features of this project are there. It is still unproven in production and requires some adoption and time to mature before it can be considered a stable release.

## Overview

DemandJS provides lazy loading of resources as they scroll into view using true progressive enhancement and the latest browser features. DemandJS works with most elements using a src attribute including images, videos, and there is extra support for embedding external content of all types, and especially html files. DemandJS uses the latest (2017) of modern browser features and aims to be as efficient and lightweight as possible. For older browser compatibility, you can polyfill features to reach your target audience.

Loading resources on demand can drastically reduce initial page load times and perceived page performance.

## Best Practices

* It is important that your loading elements are approximately the same dimensions as your actual content. DemandJS replaces your actual content with loading elements (e.g. loading anmiation). When the loading element becomes visible on the page, demandjs will begin loading your actual content. If the loading element is significantly smaller than the actual content, and several are clumped together in the layout, loading may start earlier than was actually needed. If your loading elements are significantly larger than your actual content, and several are clumped together, inserting your actual content into the page may lead to other loading elements popping into view, and hence additional loads happening later than intended.

* In the default configuration, demandjs will ignore any elements with the 'nodemand' class. You may also use the ```ignoreSelector``` option to customize which elements are ignored. ([see test020](test/test020.html))

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
  * The demandjs events such as onLoadBegin, onLoadSuccess, etc... will be invoked as usual, and do not need to be addressed by the extension code.
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
      return this.createFailureNode(target, error);
    }
  }
};
window.DemandJSDemanded = new DemandJS(options);
```

Errors can also be captured and handled by passing a custom function as ```onLoadFailure``` in the options object. This function is expected to do any dom modifications directly as needed. This is the most robust way of configuring error handling, but also comes with the greatest responsibility. Be sure to remove the target node (if you don't want it to be shown in the page).

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
  onLoadFailure: function(target, ex) {
    alert(ex.message);
    this.onLoadFailure(target, ex);
  }
};
window.DemandJSDemanded = new DemandJS(options);
```

## Event Handling

DemandJS provides events for tracking relevant activity. 

```onLoadBegin(t)``` will be invoked when the element ```t``` first scrolls into view and the loading process is initiated. ([see test016](test/test016.html))

```onLoadSuccess(t)``` will be invoked when the element ```t``` finishes loading and is succesfully inserted into the dom. ([see test017](test/test017.html))

```onLoadFailure(t, ex)``` will be invoked when the loading process for element ```t``` fails. The ```ex``` argument contains a javascript ```Error``` containing the details of the failure. The default implementation for this event is responsible for inserting the ```failureHtml``` into the dom.
 ([see test011](test/test011.html))

```onLoadComplete(t)``` will be invoked when the loading process for element ```t``` is finished, and will be invoked both on success and on failure. ([see test018](test/test018.html))

Each event handler is invoked with 'this' set to the DemandJS instance. A default implementation for each of these events is also defined on the DemandJS object. Unless replacing the default behavior (such as for onLoadFailure()) is the intention, it would be a good idea to also invoke the default implementation of each event handler.

## Demand Classes
Demand classes enable different content to be configured in different ways without using multiple instances of DemandJS. The most common usage is to display different loading or error animations for different content.


The default attribute used for a demand class is ```data-demand``` (this can be configured with the ```demandClassAttribute``` option). When a demand class is not specified a default of ```default``` is used instead (this  can be configured with the ```defaultDemandClass``` option).

```html
  <img id='image1' src='test.jpg' /> <!-- standard -->
  <img id='image2' src='test.jpg' data-demand='spinner' /> <!-- demand class set to spinner -->
  <img id='image3' src='test.jpg' data-demand='progress' /> <!-- demand class set to progress -->
  <img id='image4' src='test.jpg' data-demand='hideError' /> <!-- demand class set to hideError -->
```

Once this is configured, each demand class can have different configuration given across any or all of the compatible DemandJS options.

```javascript
var options = {
  loadingHtml: {
    'default': '<div style="width:100%;height:100%">Loading In Progress</div>',
    'spinner': '<img src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==" />',
    'progress': '<img src="data:image/gif;base64,R0lGODlhEAALAPQAAP///wAAANra2tDQ0Orq6gYGBgAAAC4uLoKCgmBgYLq6uiIiIkpKSoqKimRkZL6+viYmJgQEBE5OTubm5tjY2PT09Dg4ONzc3PLy8ra2tqCgoMrKyu7u7gAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCwAAACwAAAAAEAALAAAFLSAgjmRpnqSgCuLKAq5AEIM4zDVw03ve27ifDgfkEYe04kDIDC5zrtYKRa2WQgAh+QQJCwAAACwAAAAAEAALAAAFJGBhGAVgnqhpHIeRvsDawqns0qeN5+y967tYLyicBYE7EYkYAgAh+QQJCwAAACwAAAAAEAALAAAFNiAgjothLOOIJAkiGgxjpGKiKMkbz7SN6zIawJcDwIK9W/HISxGBzdHTuBNOmcJVCyoUlk7CEAAh+QQJCwAAACwAAAAAEAALAAAFNSAgjqQIRRFUAo3jNGIkSdHqPI8Tz3V55zuaDacDyIQ+YrBH+hWPzJFzOQQaeavWi7oqnVIhACH5BAkLAAAALAAAAAAQAAsAAAUyICCOZGme1rJY5kRRk7hI0mJSVUXJtF3iOl7tltsBZsNfUegjAY3I5sgFY55KqdX1GgIAIfkECQsAAAAsAAAAABAACwAABTcgII5kaZ4kcV2EqLJipmnZhWGXaOOitm2aXQ4g7P2Ct2ER4AMul00kj5g0Al8tADY2y6C+4FIIACH5BAkLAAAALAAAAAAQAAsAAAUvICCOZGme5ERRk6iy7qpyHCVStA3gNa/7txxwlwv2isSacYUc+l4tADQGQ1mvpBAAIfkECQsAAAAsAAAAABAACwAABS8gII5kaZ7kRFGTqLLuqnIcJVK0DeA1r/u3HHCXC/aKxJpxhRz6Xi0ANAZDWa+kEAA7AAAAAAAAAAAA" />'  
  }
};
window.DemandJSDemanded = new DemandJS(options);
```

In this configuration above, image1 (which has no data-demand attribute) will use the ```loadingHtml``` configuration associated with the 'default' demand class. Image2 (which has data-demand="spinner") will use the ```loadingHtml``` configuration with the base64 encoded spinner gif. Image3 (which has data-demand="progress") will use the ```loadingHtml``` configuration with the base64 encoded progress bar gif. Image4 (which has data-demand="hideError") is in the hideError demand class, which does not have a configuration for ```loadingHtml``` and so the default (same as Image1) is used instead.

Any option that supports demand classes can be defined in a similar way to ```loadingHtml``` above. If demand classes are not required, simply define those options directly instead.

Demand classes are supported for all of the following options:

  * loadingHtml ([see test012](test/test012.html))
  * failureHtml ([see test013](test/test013.html))
  * createLoadingNode ([see test014](test/test014.html))
  * createFailureNode ([see test015](test/test015.html))
  * onLoadBegin ([see test016](test/test016.html))
  * onLoadSuccess ([see test017](test/test017.html))
  * onLoadComplete ([see test018](test/test018.html))
  * onLoadFailure ([see test019](test/test019.html))

## Configuration

  The DemandJS constructor accepts a single argument, which is the options collection. 

  | Field                  | Description | Default |
  |------------------------|-------------|---------|
  | demandClassAttribute   | This option specifies the attribute used to lookup the demand class on each element | data-demand |
  | defaultDemandClass     | This option specifies the demand class that is used if no demand class is specified | default |
  | loadingHtml            | This option controls the Html injected into the page while elements are loading. This is the easiest way to configure the loading indicator UI | `<div style="width:100%;height:100%">Loading In Progress</div>` |
  | createLoadingNode      | ```function(target){}``` This is a function, invoked each time loading UI must be created. It is passed one argument, the html element that is being replaced. In case the loadingHtml option isn't robust enough, you can overlaod this function to have full control over the loading UI being injected into the page. This function should return a collection of htmlElement nodes that can be inserted into the DOM. | Defined as a functor to creating the `loadingHtml` specified |
  | failureHtml             | This option controls the Html injected into the page when loading fails. This is the easy way to configure a special UI for error messages | `<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>` |
  | createFailureNode     | ```function(target,error){}``` This is a function, invoked each time loading fails, and error  UI must be created. It is passed two arguments, the first is the html element that has failed. The second is a standard javascript 'Error'. In case the failureHtml option isn't robust enough, you can overlaod this function to have full control over the loading UI being injected into the page. This function should return a collection of htmlElement nodes that will be inserted into the DOM automatically. | Defines a functor to creating the `failureHtml` |
  | selector             | This is a css selector, defining which elements should be matched and processed. You can change this to include additional elements, or limit the elements being procssed to a subset of the entire page. You may use the full selector syntax (see https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Selectors)  | `img,video,picture,iframe,link.demand` |
  | ignoreSelector       | This is a css selector, defining elements which should be ignored by demandjs. This is evaluated after the selector is evaluated (so when possible prefer using that) to exclude certain elements from demand loading behaviors. You may use the full selector syntax (see: https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Selectors) | .nodemand |
  | rootMargin           | This defines the margin around the viewport that is considered 'in-view'. Can have values similar to the CSS margin property e.g. `10px 20px 30px 40px` | `48px` |
  | threshold            | Defines the percentage between 0 (any %) and 1 (100%) the loading element must be visible before the image begins loading. The intersection observer API supports multiple threshold levels, however DemandJS only is going to do anything meaningful with the lowest specified threshold. Actual loading is also affected by the `rootMargin` property as well. | `0` |
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
* hasAttribute - for <= ie7

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
* [test012](test/test012.html)
* [test013](test/test013.html)
* [test014](test/test014.html)
* [test015](test/test015.html)
* [test016](test/test016.html)
* [test017](test/test017.html)
* [test018](test/test018.html)
* [test019](test/test019.html)
* [test020](test/test020.html)

## Release Notes 

* 1.0.0-rc.2 - added demand Classes
* 1.0.0-rc.2 - added ignoreSelector
* 1.0.0-rc.2 - bugfixes
* 0.0.4 - error handling fleshed out and tested
* 0.0.3 - added 'linkHandler' option and more documentation improvements
* 0.0.2 - added support for srcset attribute, picture elements, and more advanced usages of video (audio) that embed source elements as opposed to using direct src fields
* 0.0.2 - add support for picture elementsmedia
* 0.0.2 -  support advance video (audio) that use source elements and embedded html as opposed to using the src attribute
* 0.0.1 - Initial Version, supports img / iframe / video / link type=text/html
