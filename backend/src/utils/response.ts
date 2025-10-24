export function successResponse(payload: any) {
  if (Array.isArray(payload)) {
    return { success: true, data: payload };
  }
  if (payload && typeof payload === "object") {
    return { success: true, ...payload };
  }
  return { success: true, data: payload };
}

export function errorResponse(error: string) {
  return { success: false, error };
}
