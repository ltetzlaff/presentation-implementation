# Presentation API Proof-of-Concept Implementation

Authors: Lukas Tetzlaff, Nico Tasche, Simone Egger

## Abstract

***TODO***


## Introduction

The scope of this document is set to report details about the implementation of the World Wide Web Consortium's Presentation API. The specification was published by the Second Screen Presentation Working Group and submitted as a Candidate Recommendation in July 2016 with the current Editor's Draft version being dated to February, 16 2017.

Paraphrasized, the API aims to provide a generalized way of accessing and connecting display ressources using web technology thus providing means to present content from a given website to a display and gain restricted remote access to their browsing context by messaging. Effectively this system relies on two dedicated roles, the Controller and the Receiver, obtained by the respective User Agents of on the one hand the initiating web page and on the other hand the display, whereas these may also be identical thus allowing a 1-User-Agent situation. This document and the implementation assume the  2-User-Agent case since 1-UA is to be most prominently used in conjunction with a native way of transmitting the rendered presentation for example by encoding to png and sending it to an external display entity.

## Architecture

To facilitate using the Presentation API in terms of hosting a presentation, connecting to a presentation and using the established connection the interface to the user or rather the application developer is kept simple and straight-forward as to be seen in [Usage Example][usage-example]. Generally speaking there are three distinct entities involved in the aforementioned processes, the first being the Receiving User Agent. In case of a browser vendor's implementation of the API this is most likely to be integrated into the b5r6rowser natively or as a plugin, whereas in this implementation it's a polyfill housed in a loaded html-document, followingly referred to as the *Receiver*.

The counterpart is the Controlling Browser Agent which acts upon input from the controlling browsing context. Due to the closely coupled relation in the internal procedures of the specification those two entities have been combined into the *Controller* which can be any regular web page enriched by the same aforementioned PresentationAPI-polyfill and scripts containing the desired controller logic of the application developer.

As soon as the Controller knows about the possibility to present on a remote display (~~ Presentation Availability) it may start a Presentation Connection and instruct the Receiver to create a receiving browsing context, here referred to as the *Presentation*, which is the final third component. This is another document written by the application developer that needn't be much different from the "regular" controlling page since it can identify if it is loaded as a Presentation and act accordingly.

Since the specificiation relies heavily on individual vendor-specific mechanisms this implementation also provides a configuration interface for the User Agent level that requires a set of handlers[Configuration][configuration]. To prove this concept two distinct approaches were realized, as seen in [Demo][demo], one relying purely on ajax and long-polling thus offering maximum compatibility and the second one on WebSockets for a more standard bidirectional low-latency communication, abstracted by third-party library SocketIO which by default also includes a long-polling fallback.

As of this implementation the required logic was split up in separate files that need to be included as seen below.

### Scripts

| Script                    | Controller | Receiver  | Receiving Context | Description                       |
| ---                       |     ---    |    ---    |        ---        |    ---                            |
| util.js                   |      Y     |     Y     |         Y         | General utilities to stay vanilla |
| presentation.js           |      Y     |     Y     |         Y         | Polyfill of Presentation API      |
| presentationUserAgent.js  |      Y     |     Y     |                   | Vendor-specific realization       |
| implementation.*.js       |      Y     |     Y     |                   | Implementation-specifics          |
| receiver.js               |            |     Y     |                   | Hosting once loaded / Backdrop    |
| receivingContext.js       |            |           |         Y         | Communication with Receiving UA   |
| *.js                      |            |           |                   | Client scripts that use the API   |

Each entity in a Presentation scenario includes the API Polyfill, whereas only Controller and Receiver include the tasks the User Agent shall fulfill globally or in the background to provide relative safety to the receiving context thus preventing it to be conquered by malicious Controllers and displaying content that's not intend to be presented (think of a game without a fixed set of commands in which a Controller was able to inject code to manipulate player's scores or similar situations).

### Configuration

Every User Agent has a set of handlers that are to be configured apart from the - generally speaking - browser vendor specific functionality. These can be assigned by instantiating an `ImplementationConfig`-object. Per default this happens in the `implementation.*.js`-file according to the table above where the asterisk indicates the specific implementation type. This config object is then reflected onto the `PresentationUserAgent`-object on its instantiation which makes subsequent calls to any of those handlers by the predefined algorithms use the configured handler functions. Swapping configurations later on is also supported by passing the global `PresentationUserAgent`-object to the configuration's `configure` method.

## Alternative Approaches

Priorly considered approaches included stricter separation of the respective contexts and User Agents using a top-level context like a tab as the User Agent and several child contexts (iframes) as the browsing contexts. Due to the requirement that custom objects such as `PresentationRequest` or `PresentationConnection` need to be passed between context and User Agent the approach raised several problems, mainly related to serialization of these custom objects to then be transmitted via the `Window.postMessage`-interface and deserialized, keeping these multiple object instances synchronized, rerouting function calls and offering proper garbage collection.

These problems originate from the circumstance that W3C specifications are usually meant to be implemented natively by browser vendors thereby ommitting the preceding complications or falling back to proper solutions for this issue that have already been implemented.

## Shortcomings

Due to those obstacles this implementation resorted to the concept described in [Architecture][architecture] according to which some security aspects of the specification are not met, for instance:

>>>
6.6.1 Creating a receiving browsing context

When the user agent is to create a receiving browsing context, it must run the following steps:

[Read More](https://w3c.github.io/presentation-api/#creating-a-receiving-browsing-context)
>>>

In this function points 1 to 10 are not met since the receiving browsing context is not spawned as a new top-level context.

>>>
This specification adds a new token, allow-presentation, to the set of tokens allowed in the sandbox attribute of an iframe. It adds a corresponding new flag to the sandboxing flag set:

The sandboxed presentation browsing context flag

_This flag disables the Presentation API._
>>>

This kind of functionality can not be realiably enforced using non-native code hosted in one context since the method prohibiting this can simply be overridden by applying common reflection commands or generic functions such as `Object.defineProperty`.

## Extensibility

Being constrained by the above aspects the implementation could still be extended by more generic and anonymous display detection as discussed in [7.1 Personally identifiable information](https://w3c.github.io/presentation-api/#personally-identifiable-information), browser-instance-wide synchronization of existing presentation connections (like caching the `presentationId`) or recognized displays.

## Test Compliance

To identify problems in the implementation the [W3C Testharness](https://github.com/w3c/web-platform-tests/tree/master/presentation-api) was applied, yielding the following results:
***TODO***

The tests were run using the regular approach the W3C recommends (see [Web Platform Tests](***TODO***)) with the addition of priorly injecting the necessary scripts (see [Scripts][scripts]) and defering the load of inline scripts running the actual tests by a nodejs script (see [github/inject](inject-***TODO).

## Usage Example

***TODO***

## Demo

***TODO***