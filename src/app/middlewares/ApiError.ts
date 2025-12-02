class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;

    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export default ApiError;
