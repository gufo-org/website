---
title: "Why does Gufo have a blog?"
summary: "Gufo started as an experiment in squeezing everything out of one machine. This blog is for what we learned along the way, the part that code, releases and benchmarks don't say."
date: 2026-10-16
kind: Notes
tags: [gufo, meta]
---

Gufo started as a pet project. We initially bought our AMD Strix Halo 128GiB Framework Desktop as a homelab and progressively started looking at the local AI world. After experimenting with ollama and llama.cpp, we were annoyed that we couldn't use our hardware at its peak potential.

Open-source inference engines are an impressive engineering challenge for the huge hardware and model zoo they need to support. That breadth has a cost: it's not feasible to tune kernels for every supported backend. So Gufo began as an experiment with a far more limited scope: pick one machine, pick the best AI models it can run, and find out how far they can go.

While building Gufo, we learned a lot about inference engines, local agent workloads, image and audio pipelines, the Linux kernel, ROCm and even open-source maintenance: corners of engineering we didn't expect to end up in.

Most of that never shows up in a release. Code says what Gufo does, and benchmarks say how fast, but neither explains our design decisions: this blog aims to close that gap. We'll try to take ideas that sound hard at first and make them easy to understand for curious readers, whether or not they have strong technical knowledge.

One more thing. Gufo is an inference engine heavily built with AI and our own ideas, and we're happy with that. This blog is the exception we want to keep: a channel from people to people. We write the posts ourselves, for other people to read. AI helps us correct and polish our English and build interactive playgrounds.
