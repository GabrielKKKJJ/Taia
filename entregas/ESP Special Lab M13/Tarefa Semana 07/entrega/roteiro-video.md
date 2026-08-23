# 7.2 Final Speaking Assignment — Video Script (2 minutes)

**Deliverable:** a 2-minute video, uploaded as `DjordanMouraAssignment7.mp4`
**Task:** talk about your current or most recent software development project.
**Worth:** 250 points — the heaviest assignment of the term.

Target length: ~280 words ≈ 2 minutes at a calm pace. Don't rush to fit everything —
the graders score speaking, not word count.

---

## Script

Hi, my name is Djordan Moura, and today I want to tell you about the project I have been
working on this term: a multiplayer game called **Battle Tanks**.

It is a two-dimensional online game where several players control tanks in the same arena.
They move, they shoot, they destroy walls, and everything each player does has to appear on
everyone else's screen almost instantly. That last part is the whole challenge.

The frontend is built with **Angular**, and the backend with **C# and ASP.NET Core**. But
the interesting part is how the two talk to each other. At first we used only **SignalR**,
which keeps a permanent connection open between the browser and the server. It worked well
for chat and for players joining or leaving a room.

The problem appeared with game events. When a tank takes damage or a wall is destroyed,
that information cannot simply be lost, and it has to survive if a player disconnects and
comes back. So we added a second protocol, **MQTT**, and stored the recent events in
**Redis**. Now SignalR carries what only matters during the session, and MQTT carries what
matters beyond it.

My favourite part was measuring it instead of guessing. We wrote a benchmark that sends a
thousand messages and reports the round-trip time. The average came out below one
millisecond, with a throughput above four thousand messages per second — far more than our
game actually needs. That turned an argument into evidence.

What I learned is that choosing a protocol is not about finding the best one. It is about
knowing what each one is good at, and being willing to use both.

Thank you for listening.

---

## Before recording

- **File name:** `DjordanMouraAssignment7.mp4` — first name, last name and assignment
  number, as the enunciado requires. Duplicate names overwrite earlier uploads.
- **Keep the file small.** 720p is fine; the enunciado says resolution is not the priority.
  Clear audio matters far more.
- Read it out loud twice before recording. A natural pace with a small stumble scores
  better than a fast, flat reading.
- Slow down on the technical names — *Angular*, *ASP.NET Core*, *SignalR*, *MQTT*,
  *Redis*. Those are the content words the grader listens for.
- The numbers in paragraph five are real, from the benchmark we ran. Saying them with
  confidence is what makes the project sound like yours — because it is.

## If you prefer a different angle

The script follows: *what the project is* → *what was hard* → *how we solved it* → *what I
learned*. That structure works for any project. If you would rather talk about the
notification system built with Node.js and Socket.IO, the same four beats apply.
