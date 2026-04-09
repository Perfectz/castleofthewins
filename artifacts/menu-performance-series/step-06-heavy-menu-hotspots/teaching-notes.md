# Teaching Notes

If you want a useful hotspot pass, ask for the heaviest individual screens, not "general optimization."

Good prompt traits:
- name a small number of target surfaces
- require before and after measurements from the real runtime
- ask what work happens on open and what work happens on simple in-menu interactions
- ask whether hidden panels, non-visible sections, or repeated derived data are being computed anyway
- require visible screenshots and a timing table so the work stays grounded

What worked well in this step:
- the scope stayed tight: pack, field guide, provisioner
- code inspection was paired with Playwright evidence
- improvements were judged by response time and visible smoothness, not by abstract render theory

What to avoid:
- chasing tiny helper micro-optimizations before you know which menu is actually heavy
- assuming DOM node count alone explains slowness
- optimizing every menu at once and losing the ability to say which change helped
