# wants

A small CLI for thinking twice before buying something.

`wants` is a personal project I built mainly to learn Go by creating something I would actually use.

Instead of buying something immediately, you add it to your list of wants. As time passes and you save money, `wants` helps decide how that money should be distributed between the things you want based on their necessity, utility, desire and how long you have wanted them.

## Why?

Mostly: **to learn Go.**

I wanted a project that was small enough to build from scratch, but complex enough to learn real concepts such as:

- CLI applications
- structs and methods
- file persistence
- JSON
- command-line flags
- error handling
- building and installing a Go binary

The idea behind the project also comes from trying to avoid impulsive consumption.

Rather than buying something immediately, I can add it to `wants`, wait, and gradually save towards it.

Sometimes, after waiting for a while, I realise I don't actually want it anymore.

And sometimes I do — in which case finally buying it feels more like a reward than an impulse.

## How it works

Each item has information such as:

- Price
- Necessity
- Utility
- Desire
- Wish (active for saving or not)
- Time since it was added
- Amount already saved

`Wish` is used to separate a "desired" list from an "active buying" list:

- `wish=true`: the item is active, gets a score, and receives deposits.
- `wish=false`: the item stays in your list, but is ignored for score/deposit distribution.

Based on these values, `wants` calculates a score for each item.

When money is deposited, it is distributed between the active items according to their scores.

An item can never receive more money than its price. If an allocation would exceed its price, the remaining money is redistributed among the other items.

## Commands

```bash
wants add
wants list
wants deposit
wants modify
wants cancel
wants help