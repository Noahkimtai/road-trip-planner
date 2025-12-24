import React from "react";
import { toast } from "@/components/ui/use-toast";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: React.ReactElement;
}

class ToastService {
  // Success toast with green styling and check icon
  success(message: string, options?: ToastOptions) {
    return toast({
      variant: "success",
      title: options?.title || "✅ Success",
      description: message,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  }

  // Error toast with red styling and X icon
  error(message: string, options?: ToastOptions) {
    return toast({
      variant: "destructive",
      title: options?.title || "❌ Error",
      description: message,
      duration: options?.duration || 6000,
      action: options?.action,
    });
  }

  // Warning toast with yellow styling and alert icon
  warning(message: string, options?: ToastOptions) {
    return toast({
      variant: "warning",
      title: options?.title || "⚠️ Warning",
      description: message,
      duration: options?.duration || 5000,
      action: options?.action,
    });
  }

  // Info toast with blue styling and info icon
  info(message: string, options?: ToastOptions) {
    return toast({
      variant: "info",
      title: options?.title || "ℹ️ Info",
      description: message,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  }

  // Loading toast with spinner
  loading(message: string, options?: ToastOptions) {
    return toast({
      variant: "info",
      title: options?.title || "🔄 Loading",
      description: message,
      duration: options?.duration || 0, // Don't auto-dismiss loading toasts
      action: options?.action,
    });
  }

  // Promise toast - shows loading, then success/error based on promise result
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: ToastOptions
  ): Promise<T> {
    const loadingToast = this.loading(messages.loading, options);

    try {
      const result = await promise;

      // Dismiss loading toast
      loadingToast.dismiss();

      // Show success toast
      const successMessage =
        typeof messages.success === "function"
          ? messages.success(result)
          : messages.success;
      this.success(successMessage, options);

      return result;
    } catch (error) {
      // Dismiss loading toast
      loadingToast.dismiss();

      // Show error toast
      const errorMessage =
        typeof messages.error === "function"
          ? messages.error(error)
          : messages.error;
      this.error(errorMessage, options);

      throw error;
    }
  }

  // API-specific toast methods
  api = {
    // Trip-related toasts
    tripCreated: (tripName: string) =>
      this.success(`Trip "${tripName}" created successfully!`, {
        title: "Trip Created",
        description: "Your trip has been saved and is ready to use.",
      }),

    tripCreateFailed: (error: string) =>
      this.error(`Failed to create trip: ${error}`, {
        title: "Trip Creation Failed",
        description: "Please check your connection and try again.",
      }),

    tripUpdated: (tripName: string) =>
      this.success(`Trip "${tripName}" updated successfully!`, {
        title: "Trip Updated",
      }),

    tripDeleted: (tripName: string) =>
      this.success(`Trip "${tripName}" deleted successfully!`, {
        title: "Trip Deleted",
      }),

    // Stop-related toasts
    stopAdded: (stopName: string) =>
      this.success(`Stop "${stopName}" added to trip!`, {
        title: "Stop Added",
      }),

    stopRemoved: (stopName: string) =>
      this.success(`Stop "${stopName}" removed from trip!`, {
        title: "Stop Removed",
      }),

    // Authentication toasts
    loginSuccess: (userName: string) =>
      this.success(`Welcome back, ${userName}!`, {
        title: "Login Successful",
      }),

    loginFailed: (error: string) =>
      this.error(`Login failed: ${error}`, {
        title: "Login Failed",
        description: "Please check your credentials and try again.",
      }),

    logoutSuccess: () =>
      this.info("You have been logged out successfully.", {
        title: "Logged Out",
      }),

    // General API toasts
    networkError: () =>
      this.error("Network error. Please check your connection.", {
        title: "Connection Error",
        description: "Unable to connect to the server.",
      }),

    serverError: () =>
      this.error("Server error. Please try again later.", {
        title: "Server Error",
        description: "Something went wrong on our end.",
      }),

    // Weather and recommendations
    weatherLoadFailed: () =>
      this.warning("Unable to load weather data. Using default values.", {
        title: "Weather Unavailable",
      }),

    recommendationsLoadFailed: () =>
      this.warning("Unable to load recommendations. Please try again.", {
        title: "Recommendations Unavailable",
      }),
  };
}

export const toastService = new ToastService();
