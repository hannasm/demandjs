# DemandJS

## Version

0.0.1 - this is still a pre-release / in development version but it is fairly functional, if you're brave enough

## Overview

DemandJS is a javascript library to manage resources including images, videos, and even embedding external html files
directly into another page. DemandJS uses the most modern browser features to implement resource management in the
most efficient and lightweight way possible. For older browser compatibility, you can polyfill these features
to get similar results.

## Usage

To just get up and running with demandJS you simply import the file into your page and instantiate it:

```javascript
window.DemandJSDemanded = new DemandJS();
```

the default options will capture all img, video, iframe in the page, replace them with a boilerplate loading text,
and then load only those images actually visible in the browser window

```html
<img src="myImage.jpg" />
<video src="myVideo.mp4" />
<iframe src="iframeContent.html" />
```

the default options will also capture link tags with a class of 'demand'. A link marked with demand class and referencing
an .html page will cause the browser to fetch the contents of that html page and inject it directly into the page.

```html
<link rel="prefetch" class="demand" href="otherPage.html" />
```

DemandJS monitors the DOM for changes and any matching elements added to the page will automatically be captured and
handled in the same way as elements that were already on the page. This means that all of your dynamic UI will automatically 
be configured to load on demand as well.

### Configuration

  The DemandJS constructor accepts a single argument, which is the options collection. 

  | Field                  | Description | Default |
  |------------------------|-------------|---------|
  | pendingHTML            | This option controls the HTML injected into the page while elements are loading. This is the easiest way to configure the loading indicator UI | `<div style="width:100%;height:100%">Loading In Progress</div>` |
  | createPlaceholder      | This is a function, invoked each time loading UI must be created. It is passed one argument, the html element that is being replaced. In case the pendingHTML option isn't robust enough, you can overlaod this function to have full control over the loading UI being injected into the page. This function should return a collection of htmlElement nodes that can be inserted into the DOM. | Defined as a functor to creating the `pendingHTML` specified |
  | errorHTML             | This option controls the HTML injected into the page when loading fails. This is the easy way to configure a special UI for error messages | `<div style="background-color:#F00;color:#FFF;font-size:20pt;">ERROR</div>` |
  | createErrorNodeo     | This is a function, invoked each time loading fails, and error  UI must be created. It is passed two arguments, the first is the html element that has failed. The second is a non-standard (and possibly undefined) error detail, which could possibly be an exception, a generic message, or again undefined. In case the errorHTML option isn't robust enough, you can overlaod this function to have full control over the loading UI being injected into the page. This function should return a collection of htmlElement nodes that can be inserted into the DOM. | Defines a functor to creating the `errorHTML` |
  | selector             | This is a css selector, defining which elements should be matched and processed. You can change this to include additional elements, or limit the elements being procssed to a subset of the entire page. | `img,video,iframe,link.demand` |
  | rootMargin           | This defines the margin around the viewport that is considered 'in-view'. Can have values similar to the CSS margin property e.g. `10px 20px 30px 40px` | `48px` |
  | threshold            | Defines the percentage between 0 (any %) and 1 (100%) the placeholder element must be visible before the image begins loading. The intersection observer API supports multiple threshold levels, however DemandJS only is going to do anything meaningful with the lowest specified threshold. Actual loading is also affected by the `rootMargin` property as well. | `0` |


# Polyfill Dependencies
You will need to polyfill any essential components if you want to use this library. There are some additional optional
polyfills that are only required for specific features.

WeakMap - essential
IntersectionObserver  - essential
MutationObserver - essential
HTMLElement.matches - essential (IE8/IE9 only?)
fetch - currently only required when fetching links
promise - currently only required when fetchign links


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
