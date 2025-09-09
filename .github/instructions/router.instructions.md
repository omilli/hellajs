---
applyTo: "{packages/router/**,tests/router/**}"
---

<technical-internals>
  <core-architecture>
    <routing-system>
      <route-matching-engine>
        The router implements a sophisticated multi-layered matching system. Pattern matching uses parametric routes with :param syntax, supporting both flat and nested routing structures. The pattern matching system handles parameter extraction with URL decoding, while route matching combines pattern matching with query string parsing via query parsing for complete request analysis.
      </route-matching-engine>
      <state-management>
        Central route state is maintained via a reactive signal containing route information (handler, params, query, path). This signal automatically triggers re-renders when navigation occurs. The route() signal serves as the single source of truth for current routing state, integrating seamlessly with HellaJS's reactive system.
      </state-management>
    </routing-system>
    <navigation-engine>
      <programmatic-navigation>
        navigation system provides full programmatic control with parameter interpolation and query string building. Parameters are URL-encoded via URL encoding and interpolated into :param placeholders. Query objects are serialized with proper URL encoding using URL encoding. The browser navigation handles actual browser navigation with replace/push options via navigation options.
      </programmatic-navigation>
      <browser-integration>
        Automatic popstate event handling synchronizes browser back/forward buttons with route state. Window location changes update the route signal immediately, triggering reactive updates throughout the application. Navigation preserves browser history management.
      </browser-integration>
    </navigation-engine>
    <execution-model>
      <route-resolution-priority>
        Resolution follows a strict priority order implemented in the routing system: 1) Global redirects via redirect configuration, 2) Route-level string redirects, 3) Nested route matching (prioritized by specificity via specificity sorting), 4) Flat route matching (fallback), 5) Not found handler execution via not found handler. This ensures predictable routing behavior.
      </route-resolution-priority>
      <hook-execution-lifecycle>
        Hook execution follows a defined sequence via hook execution: global before hooks → route-specific before hooks → handler execution → route-specific after hooks → global after hooks. Hooks can return values that are passed to subsequent hooks in the chain via hook processing, enabling data flow and conditional execution.
      </hook-execution-lifecycle>
    </execution-model>
  </core-architecture>
  <pattern-matching-system>
    <parametric-routes>
      <parameter-extraction>
        Route parameters use :param syntax and are extracted during matching. Parameters are automatically URL-decoded and provided to handlers as a params object. Type-safe parameter extraction is supported through TypeScript's template literal types, enabling compile-time parameter validation.
      </parameter-extraction>
      <nested-route-matching>
        Nested routes support hierarchical structures with child route inheritance. The nested route matching recursively traverses route trees, accumulating parameters from parent routes. Remaining path segments are passed down the hierarchy, enabling complex nested navigation patterns.
      </nested-route-matching>
    </parametric-routes>
    <specificity-sorting>
      <route-prioritization>
        Routes are sorted by specificity to ensure predictable matching. Wildcard routes (* patterns) have lowest priority, while routes with more path segments have higher priority. The specificity sorting() function implements this ordering by comparing wildcard presence and segment count to prevent ambiguous matches.
      </route-prioritization>
      <conflict-resolution>
        When multiple routes could match, the most specific route wins. This prevents issues where generic routes capture traffic intended for specific routes. The algorithm considers wildcard presence and segment count (bSpecificity - aSpecificity) to determine priority.
      </conflict-resolution>
    </specificity-sorting>
  </pattern-matching-system>
  <hook-architecture>
    <global-hooks>
      <lifecycle-integration>
        Global hooks (before/after) execute for every route change, providing application-wide lifecycle management. These hooks are ideal for authentication checks, analytics tracking, and global state updates that should occur on every navigation.
      </lifecycle-integration>
      <execution-context>
        Global hooks have access to current route information and can influence routing decisions. Before hooks can prevent navigation by throwing errors or returning falsy values. After hooks receive the result of route handler execution.
      </execution-context>
    </global-hooks>
    <route-specific-hooks>
      <handler-composition>
        Individual routes can define before/after hooks alongside their main handler. This enables route-specific logic like permission checks, data preloading, and cleanup operations. Route hooks execute after global hooks but follow the same before�handler�after pattern.
      </handler-composition>
      <data-flow-patterns>
        Hook chains support data passing between execution phases. Results from before hooks are available to handlers, and handler results are available to after hooks. This enables sophisticated data transformation and validation pipelines.
      </data-flow-patterns>
    </route-specific-hooks>
  </hook-architecture>
  <url-management>
    <encoding-system>
      <safe-url-handling>
        All URL components are properly encoded/decoded using encodeURIComponent/decodeURIComponent via dedicated encoding and decoding utilities. These utilities handle special characters safely, preventing URL corruption and security issues. Query parameters and path segments maintain encoding integrity throughout the routing process.
      </safe-url-handling>
      <query-string-processing>
        Query strings are parsed into key-value objects with automatic URL decoding. The query parsing function handles multiple values, empty parameters, and special characters correctly. Query objects are serialized back to valid URL format during navigation.
      </query-string-processing>
    </encoding-system>
    <redirect-management>
      <global-redirects>
        Global redirect array enables site-wide URL rewriting. Redirects are processed before route matching, allowing legacy URL support and URL structure changes. Multiple source patterns can redirect to single destinations.
      </global-redirects>
      <route-redirects>
        Individual routes can be strings that act as redirects to other paths. These are processed during the route matching phase, enabling route-specific redirections based on matching patterns. Useful for aliasing and route consolidation.
      </route-redirects>
    </redirect-management>
  </url-management>
  <performance-optimization>
    <lazy-evaluation>
      <route-matching-efficiency>
        Route matching is optimized for common cases. Simple routes match quickly without complex processing. Parameter extraction only occurs when patterns actually match. Query parsing is deferred until needed by handlers.
      </route-matching-efficiency>
      <memory-management>
        Route state changes trigger minimal re-computation. The reactive system ensures only affected components update when navigation occurs. Constant objects (EMPTY_OBJECT) from utils reduce allocation pressure for routes without parameters or query strings.
      </memory-management>
    </lazy-evaluation>
    <caching-strategies>
      <route-compilation>
        Route patterns are processed dynamically without pre-compilation overhead using pattern matching and nested route processing. Dynamic matching allows for flexible route definitions while maintaining performance. The matching algorithm prioritizes specificity and handles both flat and nested routing efficiently.
      </route-compilation>
      <state-consistency>
        Route state updates are atomic and consistent. Navigation changes update all related state simultaneously, preventing intermediate states that could cause UI glitches. The reactive system ensures dependent computations update correctly.
      </state-consistency>
    </caching-strategies>
  </performance-optimization>
  <integration-patterns>
    <reactive-binding>
      <signal-integration>
        The route signal integrates seamlessly with HellaJS's reactive system. Components can subscribe to route changes using standard reactive patterns. Computed values can derive from route state, and effects can respond to navigation events automatically.
      </signal-integration>
      <component-patterns>
        Route handlers typically return JSX components or reactive updates. The router doesn't impose specific rendering patterns, allowing integration with any component system. Route parameters and query data flow naturally to components through reactive binding.
      </component-patterns>
    </reactive-binding>
    <async-handling>
      <promise-support>
        Route handlers can be async functions returning promises. The router handles promise resolution gracefully, allowing for data loading and async operations during route transitions. Error handling works consistently for both sync and async handlers.
      </promise-support>
      <loading-states>
        While the router doesn't provide built-in loading states, the reactive system enables easy implementation through computed values that track promise states. Loading indicators can be derived from route transition states.
      </loading-states>
    </async-handling>
  </integration-patterns>
  <type-safety>
    <parameter-typing>
      <template-literal-types>
        TypeScript template literal types provide compile-time parameter validation. Route patterns like "/user/:id" generate type-safe parameter objects with id: string. This prevents runtime errors from missing or misnamed parameters.
      </template-literal-types>
      <handler-signatures>
        Route handlers receive properly typed parameter and query objects. Handlers without parameters have different signatures than those with parameters, preventing confusion and ensuring type safety at the call site.
      </handler-signatures>
    </parameter-typing>
    <configuration-validation>
      <route-map-typing>
        Route maps are strongly typed, ensuring route patterns match handler signatures. The type system validates that handlers can accept the parameters their route patterns define. This catches configuration errors at compile time.
      </route-map-typing>
      <nested-route-safety>
        Nested route structures maintain type safety through recursive type definitions. Child routes inherit parent parameter types while adding their own. This ensures type consistency across the entire routing hierarchy.
      </nested-route-safety>
    </configuration-validation>
  </type-safety>
  <error-handling>
    <graceful-degradation>
      <not-found-handling>
        Unmatched routes trigger the notFound handler, providing graceful fallback behavior. Applications can define custom 404 pages or redirect to default routes. The system never fails silently on unmatched routes.
      </not-found-handling>
      <exception-propagation>
        Exceptions in route handlers are handled gracefully without breaking the routing system. The router maintains consistent state even when handlers throw errors. Error boundaries can catch and handle route-level exceptions.
      </exception-propagation>
    </graceful-degradation>
    <validation-patterns>
      <parameter-validation>
        While the router provides type safety, runtime parameter validation is the application's responsibility. Route handlers should validate parameter values for security and correctness, especially when dealing with user input.
      </parameter-validation>
      <hook-error-handling>
        Errors in hooks can prevent route transitions or be handled gracefully depending on implementation. Before hooks can block navigation by throwing, while after hooks typically should handle errors internally to avoid breaking the routing flow.
      </hook-error-handling>
    </validation-patterns>
  </error-handling>
</technical-internals>