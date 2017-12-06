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
and then load only htose images actually visible in the browser windownew

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

DemandJS monitors the DOM for changes and will detect any matching elements added to the page dynamically as well. This
means that all of your interactive UI will automatically be configured to load on demand as well.

## Polyfill Dependencies
You will need to polyfill any essential components if you want to use this library. There are some additional optional
polyfills that are only required for specific features.

WeakMap - essential
IntersectionObserver  - essential
MutationObserver - essential
fetch - currently only required when fetching links
promise - currently only required when fetchign links 

## Build Dependencies

dotnet core 2.0 is being used for builds - demandjs.csproj defines all the automation, a sln file is also included

the build depends on several javascript precompilers to transpile to es5 (babel) and minify (closure)

npm install --save-dev babel-cli babel-preset-env
npm install --save-dev google-closure-compiler

demandjs.debug.js - we build a debug version of the library using babel only, which creates a valid source map to the original source code and transpiles to ES5.

demandjs.min.js - we build a release version of the library by first transpiling with babel and then minifying / optimizing with closure
