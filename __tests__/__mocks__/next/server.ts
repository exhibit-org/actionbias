export class NextRequest extends Request {
  constructor(input, init) {
    super(input, init);
    // Allow setting URL for testing purposes
    Object.defineProperty(this, 'url', {
      writable: true,
      value: input,
    });
  }
}

export class NextResponse extends Response {
  static json(data, init) {
    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  }
}
