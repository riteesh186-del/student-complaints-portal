package com.studentportal.complaints.security;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Small in-memory sliding-window counter, enough to slow down guessing and spam on a single instance. */
@Component
public class RateLimiter {
    private final Map<String, Deque<Long>> events = new ConcurrentHashMap<>();

    /** True when the key already has {@code max} or more events inside the window. */
    public boolean isBlocked(String key, int max, long windowMs) {
        return count(key, windowMs) >= max;
    }

    public void record(String key) {
        Deque<Long> deque = events.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (deque) {
            deque.addLast(System.currentTimeMillis());
        }
    }

    public void clear(String key) {
        events.remove(key);
    }

    private int count(String key, long windowMs) {
        Deque<Long> deque = events.get(key);
        if (deque == null) return 0;
        long cutoff = System.currentTimeMillis() - windowMs;
        synchronized (deque) {
            while (!deque.isEmpty() && deque.peekFirst() < cutoff) deque.pollFirst();
            if (deque.isEmpty()) events.remove(key, deque);
            return deque.size();
        }
    }
}
