export interface HttpExceptionOptions {
	headers?: HeadersInit;
	cause?: unknown;
	body?: unknown;
}

export class HttpException extends Error {
	readonly status: number;
	readonly statusText: string;
	readonly headers?: HeadersInit;
	readonly body?: unknown;

	constructor(
		status: number,
		message: string,
		statusText = message,
		options: HttpExceptionOptions = {},
	) {
		super(message, { cause: options.cause });
		this.name = new.target.name;
		this.status = status;
		this.statusText = statusText;
		this.headers = options.headers;
		this.body = options.body;
	}

	toResponse(): Response {
		const headers = new Headers(this.headers);

		if (!headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}

		return new Response(
			JSON.stringify(
				this.body ?? {
					statusCode: this.status,
					error: this.statusText,
					message: this.message,
				},
			),
			{
				status: this.status,
				headers,
			},
		);
	}
}

export class BadRequestException extends HttpException {
	constructor(message = "Bad Request", options?: HttpExceptionOptions) {
		super(400, message, "Bad Request", options);
	}
}

export class UnauthorizedException extends HttpException {
	constructor(message = "Unauthorized", options?: HttpExceptionOptions) {
		super(401, message, "Unauthorized", options);
	}
}

export class PaymentRequiredException extends HttpException {
	constructor(message = "Payment Required", options?: HttpExceptionOptions) {
		super(402, message, "Payment Required", options);
	}
}

export class ForbiddenException extends HttpException {
	constructor(message = "Forbidden", options?: HttpExceptionOptions) {
		super(403, message, "Forbidden", options);
	}
}

export class NotFoundException extends HttpException {
	constructor(message = "Not Found", options?: HttpExceptionOptions) {
		super(404, message, "Not Found", options);
	}
}

export class MethodNotAllowedException extends HttpException {
	constructor(message = "Method Not Allowed", options?: HttpExceptionOptions) {
		super(405, message, "Method Not Allowed", options);
	}
}

export class ConflictException extends HttpException {
	constructor(message = "Conflict", options?: HttpExceptionOptions) {
		super(409, message, "Conflict", options);
	}
}

export class UnprocessableEntityException extends HttpException {
	constructor(
		message = "Unprocessable Entity",
		options?: HttpExceptionOptions,
	) {
		super(422, message, "Unprocessable Entity", options);
	}
}

export class TooManyRequestsException extends HttpException {
	constructor(message = "Too Many Requests", options?: HttpExceptionOptions) {
		super(429, message, "Too Many Requests", options);
	}
}

export class InternalServerErrorException extends HttpException {
	constructor(
		message = "Internal Server Error",
		options?: HttpExceptionOptions,
	) {
		super(500, message, "Internal Server Error", options);
	}
}

export class NotImplementedException extends HttpException {
	constructor(message = "Not Implemented", options?: HttpExceptionOptions) {
		super(501, message, "Not Implemented", options);
	}
}

export class BadGatewayException extends HttpException {
	constructor(message = "Bad Gateway", options?: HttpExceptionOptions) {
		super(502, message, "Bad Gateway", options);
	}
}

export class ServiceUnavailableException extends HttpException {
	constructor(message = "Service Unavailable", options?: HttpExceptionOptions) {
		super(503, message, "Service Unavailable", options);
	}
}

export class GatewayTimeoutException extends HttpException {
	constructor(message = "Gateway Timeout", options?: HttpExceptionOptions) {
		super(504, message, "Gateway Timeout", options);
	}
}

export class NotAcceptableException extends HttpException {
	constructor(message = "Not Acceptable", options?: HttpExceptionOptions) {
		super(406, message, "Not Acceptable", options);
	}
}

export class RequestTimeoutException extends HttpException {
	constructor(message = "Request Timeout", options?: HttpExceptionOptions) {
		super(408, message, "Request Timeout", options);
	}
}

export class GoneException extends HttpException {
	constructor(message = "Gone", options?: HttpExceptionOptions) {
		super(410, message, "Gone", options);
	}
}

export class LengthRequiredException extends HttpException {
	constructor(message = "Length Required", options?: HttpExceptionOptions) {
		super(411, message, "Length Required", options);
	}
}

export class PreconditionFailedException extends HttpException {
	constructor(message = "Precondition Failed", options?: HttpExceptionOptions) {
		super(412, message, "Precondition Failed", options);
	}
}

export class PayloadTooLargeException extends HttpException {
	constructor(message = "Payload Too Large", options?: HttpExceptionOptions) {
		super(413, message, "Payload Too Large", options);
	}
}

export class UriTooLongException extends HttpException {
	constructor(message = "URI Too Long", options?: HttpExceptionOptions) {
		super(414, message, "URI Too Long", options);
	}
}

export class UnsupportedMediaTypeException extends HttpException {
	constructor(
		message = "Unsupported Media Type",
		options?: HttpExceptionOptions,
	) {
		super(415, message, "Unsupported Media Type", options);
	}
}

export class RangeNotSatisfiableException extends HttpException {
	constructor(
		message = "Range Not Satisfiable",
		options?: HttpExceptionOptions,
	) {
		super(416, message, "Range Not Satisfiable", options);
	}
}

export class ExpectationFailedException extends HttpException {
	constructor(message = "Expectation Failed", options?: HttpExceptionOptions) {
		super(417, message, "Expectation Failed", options);
	}
}

export class ImATeapotException extends HttpException {
	constructor(message = "I'm a teapot", options?: HttpExceptionOptions) {
		super(418, message, "I'm a teapot", options);
	}
}

export class MisdirectedRequestException extends HttpException {
	constructor(message = "Misdirected Request", options?: HttpExceptionOptions) {
		super(421, message, "Misdirected Request", options);
	}
}

export class LockedException extends HttpException {
	constructor(message = "Locked", options?: HttpExceptionOptions) {
		super(423, message, "Locked", options);
	}
}

export class FailedDependencyException extends HttpException {
	constructor(message = "Failed Dependency", options?: HttpExceptionOptions) {
		super(424, message, "Failed Dependency", options);
	}
}

export class TooEarlyException extends HttpException {
	constructor(message = "Too Early", options?: HttpExceptionOptions) {
		super(425, message, "Too Early", options);
	}
}

export class UpgradeRequiredException extends HttpException {
	constructor(message = "Upgrade Required", options?: HttpExceptionOptions) {
		super(426, message, "Upgrade Required", options);
	}
}

export class PreconditionRequiredException extends HttpException {
	constructor(
		message = "Precondition Required",
		options?: HttpExceptionOptions,
	) {
		super(428, message, "Precondition Required", options);
	}
}

export class RequestHeaderFieldsTooLargeException extends HttpException {
	constructor(
		message = "Request Header Fields Too Large",
		options?: HttpExceptionOptions,
	) {
		super(431, message, "Request Header Fields Too Large", options);
	}
}

export class UnavailableForLegalReasonsException extends HttpException {
	constructor(
		message = "Unavailable For Legal Reasons",
		options?: HttpExceptionOptions,
	) {
		super(451, message, "Unavailable For Legal Reasons", options);
	}
}

export class HttpVersionNotSupportedException extends HttpException {
	constructor(
		message = "HTTP Version Not Supported",
		options?: HttpExceptionOptions,
	) {
		super(505, message, "HTTP Version Not Supported", options);
	}
}

export class VariantAlsoNegotiatesException extends HttpException {
	constructor(
		message = "Variant Also Negotiates",
		options?: HttpExceptionOptions,
	) {
		super(506, message, "Variant Also Negotiates", options);
	}
}

export class InsufficientStorageException extends HttpException {
	constructor(
		message = "Insufficient Storage",
		options?: HttpExceptionOptions,
	) {
		super(507, message, "Insufficient Storage", options);
	}
}

export class LoopDetectedException extends HttpException {
	constructor(message = "Loop Detected", options?: HttpExceptionOptions) {
		super(508, message, "Loop Detected", options);
	}
}

export class NotExtendedException extends HttpException {
	constructor(message = "Not Extended", options?: HttpExceptionOptions) {
		super(510, message, "Not Extended", options);
	}
}

export class NetworkAuthenticationRequiredException extends HttpException {
	constructor(
		message = "Network Authentication Required",
		options?: HttpExceptionOptions,
	) {
		super(511, message, "Network Authentication Required", options);
	}
}
