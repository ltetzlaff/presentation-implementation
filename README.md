# Abstract




# Introduction

The scope of this document is set to report details about the implementation of the World Wide Web Consortium's Presentation API. The specification was published by the Second Screen Presentation Working Group and submitted as a Candidate Recommendation in July 2016 with the current Editor's Draft version being dated to February, 16 2017.

Paraphrasized, the API aims to provide a generalized way of accessing and connecting display ressources using web technology thus providing means to present content from a given website to a display and gain restricted remote access to their browsing context by messaging. Effectively this system relies on two dedicated roles, the Controller and the Receiver, obtained by the respective User Agents of on the one hand the initiating web page and on the other hand the display, whereas these may also be identical thus allowing a 1-User-Agent situation. This document and the implementation assume the  2-User-Agent case since 1-UA is to be most prominently used in conjunction with a native way of transmitting the rendered presentation for example by encoding to png and sending it to an external display entity.

# Architecture

To facilitate using the Presentation API in terms of hosting a presentation, connecting to a presentation and using the established connection the interface to the user or rather the application developer is kept simple and straight-forward as to be seen in \ref{UsageExample}. Generally speaking there are three distinct entities involved in the aforementioned processes, the first being the Receiving User Agent. In case of a browser vendor's implementation of the API this is most likely to be integrated into the b5r6rowser natively or as a plugin, whereas in this implementation it's a polyfill housed in a loaded html-document, followingly referred to as the *Receiver*.

The counterpart is the Controlling Browser Agent which acts upon input from the controlling browsing context. Due to the closely coupled relation in the internal procedures of the specification those two entities have been combined into the *Controller* which can be any regular web page enriched by the same aforementioned PresentationAPI-polyfill and scripts containing the desired controller logic of the application developer.

As soon as the Controller knows about the possibility to present on a remote display (~~ Presentation Availability) it may start a Presentation Connection and instruct the Receiver to create a receiving browsing context, here referred to as the *Presentation*, which is the final third component. This is another document written by the application developer that needn't be much different from the "regular" controlling page since it can identify if it is loaded as a Presentation and act accordingly.

*table with script names per role*

Since the specificiation relies heavily on individual vendor-specific mechanisms this implementation also provides a configuration interface for the User Agent level that requires a set of handlers. To prove this concept two distinct approaches were realized, as seen in \ref{Demo}, one relying purely on ajax and long-polling thus offering maximum compatibility and the second one on WebSockets for a more standard bidirectional low-latency communication.

\ref{Shortcomings}

Each user agent

## Configuration

# Alternative Approaches

*multiple stacked contexts*

# Shortcomings

*1-11 are not met in 'creating a receiving browsing context'*

# Test Compliance

# Usage Example

# Demo
