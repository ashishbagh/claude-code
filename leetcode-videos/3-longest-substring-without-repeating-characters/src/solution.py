def lengthOfLongestSubstring(s):
    last = {}                  # char -> last index seen
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1    # jump past the repeat
        last[ch] = right
        best = max(best, right - left + 1)
    return best
