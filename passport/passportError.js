module.exports = PassportError;
function PassportError(code, message) {

    console.log("error code is **", code);

    this.code = typeof code === undefined ? -1 : code;
    this.message = message || "Unknown Error";

    var last_part = new Error().stack.match(/[^\s]+$/);
    this.stack = `${this.name} at ${last_part}`;
}

Object.setPrototypeOf(PassportError, Error);
PassportError.prototype = Object.create(Error.prototype);
PassportError.prototype.name = "PassportError";
PassportError.prototype.code = -1;
PassportError.prototype.message = "";
PassportError.prototype.constructor =  PassportError;

