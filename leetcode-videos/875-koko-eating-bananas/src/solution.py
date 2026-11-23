def minEatingSpeed(piles, h):
    lo, hi = 1, max(piles)
    while lo < hi:
        k = (lo + hi) // 2
        hours = sum((p + k - 1) // k for p in piles)
        if hours <= h:
            hi = k          # k works, try slower
        else:
            lo = k + 1      # too slow, eat faster
    return lo
