# POC: Instrument Django application with OpenTelemetry

## Goals

* Use OpenTelemetry
* Collect traces in Jaeger
* Start traces in browser client that are continued in Django server

## Demo

```bash
$ npm install
$ pip install -r requirements.txt
$ (cd docker && docker-compose up -d)
$ python manage.py runserver --settings=mysite.settings

# if the client needs to be rebuilt
$ npm run build
```

1. Create a poll at http://localhost:8000/admin.
2. Vote at http://localhost:8000/polls/.
3. View traces at http://localhost:16686/. Look under the service named `otel-django-fullstack-poc`.

## Details

* I built the starter app from the Django docs.
* `pip install opentelemetry-instrumentation` was the starting point.
* `opentelemetry-bootstrap --action=install` installed the python tools I needed.
* [Auto-instrumentation](https://github.com/open-telemetry/opentelemetry-python/tree/main/opentelemetry-instrumentation#opentelemetry-instrument) didn't work for me. I added `DjangoInstrumentor().instrument()` to `manage.py` myself. This adds Django middleware to instrument all endpoints. It is also possible to instrument Celery tasks in a similar way.
* A global tracer is configured in `settings.py`. The `OTLP` exporter is not ready yet so I exported spans directly to Jaeger using the OpenTelemetry Python SDK. Spans are sent over HTTP so I didn't need to bother with gRPC in Python. But gPRC would be better.
* Added span attributes to the `vote` controller to simulate adding data to an existing span.
* Replaced traditional HTML form submission with JavaScript to demo starting a span in the client that carries through on the server. Voting in a poll illustrates this feature.
* Used `@opentelemetry/instrumentation` to set up auto-instrumentation with a configured global tracer in the browser.
* Auto-instrumentation for the web is written but not yet published to npm. So I built the package and added it as `/assets/otel-auto-instrumentations-web.js`. It configures instumentation for `DocumentLoad`, `fetch`, `XMLHttpRequest`, and general user interactions, like click actions.
* The `Jaeger` exporter is only available for `Node.js` at this time, so I used the `OTLP` exporter. The `OTEL Collector` is configured is receive `OTLP` spans and redirect them to `Jaeger`.
* Added span events to the `vote` callback to simulate capturing events along a span that covers multiple platforms. The events are named `vote-submitted` and `vote-recorded`.
* The client and server are configured to use HTTP Trace Context, via HTTP Trace Parent Headers, and HTTP Baggage to extend traces beginning in the client.
