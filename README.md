# Topo-Tool

We have a lot of options for the actual rendering target of this library however the most obvious ones to target for the initial development of this library should be available in the browser since that's where the most likely first consumers will be.

Given that targetting SVG or Canvas makes a bunch of sence but for the latter working with the canvas API's directly is going to require a dependency on something like JSDOM or a browser environment to make make the rendering possible and we want to output something that will be available in a context where javascript might not be available. For this reason, outputting static SVGs makes the most sense.

In the future we will provide more render targets or adapters for specific environments to make using this core library more flexible. We also want to avoid introducing any dependencies that are not strictly necessary for the core functionality of the library.

# Goals

## 0 Rendering External Runtime Dependencies

While there are many options for third party libraries that could help us achieve our goal of creating a topo render engine, we want to avoid using them as they are often bloated, opinionated and only

# Testing

Testing is straight forwards, for the most part this library is entirely self-contained meaning it can rely on unit tests for almost all of the functionality within.

There are a limited number of visual regression tests that are run on the library using cypress, the changes are automatically compared against the previous major release candidates.

If there are major changes to the visual appearance of the library then a manual review of the changes will be required.
