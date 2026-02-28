# Technical Decisions & Architecture Document

This document outlines the core technical decisions, architectural patterns, tradeoffs, and future considerations for the **Urban Elite (Scatch)** e-commerce platform.

## 1. Architecture Choices

**Monolithic Server-Side Rendered (SSR) Application**
*   **Pattern:** Model-View-Controller (MVC)
*   **Stack:** Node.js, Express.js, MongoDB (Mongoose), and EJS.
*   **Reasoning:** We chose a monolithic SSR approach using EJS because it allows for rapid development, straightforward routing, and excellent SEO out of the box. By rendering HTML on the server, we ensure fast initial page loads without requiring heavy client-side JavaScript bundles.
*   **Cloud-Native Media:** We integrated **Cloudinary** for image management. Serving images directly from our Node server (using local disk storage) is not scalable. Offloading media to Cloudinary provides global CDN delivery, automatic format optimization (`f_auto`), quality adjustment (`q_auto`), and on-the-fly resizing (`w_600`), severely reducing bandwidth.
*   **Payment Gateway:** Integrated **Razorpay** for seamless payment processing. Express routes securely generate orders on the backend while the frontend uses Razorpay's checkout widget.
*   **Pagination Logic:** Pagination was built heavily into the backend logic (`skip` and `limit`) rather than loading massive datasets into the client and hiding elements. This optimizes database throughput and client RAM.

## 2. Authentication Design Decisions

**JWT & Session-Based Authentication**
*   **Mechanism:** We utilize JSON Web Tokens (JWT) combined with HTTP-only cookies.
*   **Security Strategy:** 
    *   Passwords are irreversibly hashed using `bcrypt` before database insertion.
    *   JWTs are stored strictly in HTTP-only cookies, inherently protecting against Cross-Site Scripting (XSS) attacks by preventing client-side JavaScript from accessing the token.
    *   Route protection (checkout, profile, cart, admin) is handled via custom middleware (`isLoggedIn`, `isOwnerLoggedIn`) which intercepts requests, verifies tokens asynchronously, and attaches the user object to the request lifecycle.
*   **Role-Based Access Control (RBAC):** We separated the routing and authentication flows for regular users and store owners (`ownersRouter` vs `usersRouter`). This distinct separation prevents critical privilege escalation and isolates admin business logic.

## 3. Tradeoffs Made

*   **EJS (Server-Side Rendering) vs. Single Page Application (SPA):** 
    *   *Tradeoff:* We opted for EJS templates over a React/Vue SPA. While SPAs provide a highly dynamic, app-like feel without page reloads, EJS significantly reduced the initial architectural complexity and build step requirements. The tradeoff is full page navigations for most routing, though we mitigate this UX impact with intelligent redirects and lazy-loading.
*   **MongoDB (NoSQL) vs. Relational SQL:** 
    *   *Tradeoff:* We chose MongoDB. E-commerce often benefits from flexible schemas (e.g., products with unpredictable feature variations, dynamic carts, wishlists arrays). However, we trade off the strict ACID guarantees and complex joins that a Postgres/MySQL database would provide. We mitigate document bloat using Mongoose's strict schema enforcement.
*   **Server-Side vs. Client-Side Cart Management:**
    *   *Tradeoff:* Carts and wishlists are tracked directly in the MongoDB `user` document rather than strictly in browser `localStorage`. This ensures persistence across devices natively, though it costs a slight database roundtrip latency on every single "add to cart" action.

## 4. What We Would Improve With More Time

Given additional development time and resources, the following areas would be heavily prioritized:

1.  **Transition to TypeScript:** Migrating the Express backend from vanilla JavaScript to TypeScript would drastically reduce runtime errors, improve developer experience via auto-completion, and enforce strict type checking across Mongoose models and API payloads.

2.  **Implementation of a Caching Layer:** Integrating **Redis** to cache frequently accessed, heavy-read data (like homepage featured products, paginated category lists, or user sessions). This would reduce the load on MongoDB and speed up response times to milliseconds.

3.  **Headless Architecture (API First):** Refactoring the backend to strictly dish out JSON via RESTful APIs or GraphQL, and building a separate frontend using Next.js or Nuxt. This would cleanly decouple the frontend and backend, allowing for native iOS/Android mobile apps to consume the exact same API.

4.  **Robust Webhook Handling:** Implementing secure, cryptographically-signed Razorpay webhooks to verify payment captures purely server-to-server, rather than relying solely on the client-side success callback validation. 

5.  **Automated Testing Pipeline:** Introducing unit tests (Jest) for critical business logic (cart total calculation, discount application) and end-to-end tests (Cypress/Playwright) to ensure critical user flows (user registration, checkout) never break during deployments.

6.  **Advanced Validation:** Implementing a robust validation schema library like `Zod` or `Joi` in the middleware layer to strictly check all incoming request bodies before they hit the controller logic, preventing bad data vectors.
