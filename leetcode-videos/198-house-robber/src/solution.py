def rob(nums):
    prev2 = 0          # best total two houses back
    prev1 = 0          # best total one house back
    for money in nums:
        best = max(prev1,           # skip this house
                   prev2 + money)   # rob this house
        prev2, prev1 = prev1, best
    return prev1
