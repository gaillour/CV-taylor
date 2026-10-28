"use client";

import React, { useEffect, useRef, useState } from "react";

interface BufferedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onCommit: (nextValue: string) => void;
  debounceMs?: number;
}

export function BufferedInput({
  value,
  onCommit,
  debounceMs = 250,
  ...props
}: BufferedInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If not focused, synchronize with external value updates
    if (document.activeElement !== inputRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onCommit(next);
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (localValue !== value) {
      onCommit(localValue);
    }
    props.onBlur?.(e);
  };

  return (
    <input
      ref={inputRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}

interface BufferedTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string;
  onCommit: (nextValue: string) => void;
  debounceMs?: number;
}

export function BufferedTextarea({
  value,
  onCommit,
  debounceMs = 250,
  ...props
}: BufferedTextareaProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (document.activeElement !== textareaRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setLocalValue(next);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onCommit(next);
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (localValue !== value) {
      onCommit(localValue);
    }
    props.onBlur?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}
