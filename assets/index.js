'use strict';

import $ from 'jquery';
import { getWebAutoInstrumentations } from './otel-auto-instrumentations-web';
import { context, setSpan } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { CompositePropagator, HttpBaggage, HttpTraceContext } from '@opentelemetry/core';
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { BatchSpanProcessor } from '@opentelemetry/tracing';
import { WebTracerProvider } from '@opentelemetry/web';

const batchProcessor = new BatchSpanProcessor(
    new CollectorTraceExporter({
        serviceName: 'otel-django-fullstack-poc',
        endpoint: 'http://localhost:55681/v1/trace'
    })
);

const tracerProvider = new WebTracerProvider();
tracerProvider.addSpanProcessor(batchProcessor);
tracerProvider.register({
    contextManager: new ZoneContextManager(),
    propagator: new CompositePropagator({
        propagators: [
            new HttpBaggage(),
            new HttpTraceContext()
        ]
    })
});

registerInstrumentations({
    instrumentations: [
        getWebAutoInstrumentations()
    ],
    tracerProvider: tracerProvider
});

function vote(event) {
    event.preventDefault();

    const tracer = tracerProvider.getTracer('vote');
    const span = tracer.startSpan('voting');

    context.with(setSpan(context.active(), span), () => {
        span.addEvent('vote-submitted');

        fetch(event.target.action, {
            method: 'POST',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': $('input[name="csrfmiddlewaretoken"]').val()
            },
            body: new URLSearchParams({
                'choice': $('input[name="choice"]:checked').val()
            })
        })
            .then((response) => {
                span.addEvent('vote-recorded', {
                    'status_code': response.status,
                    'status_text': response.statusText
                });
                span.end();

                // Don't redirect until the trace has been recorded.
                batchProcessor.forceFlush().then(() => {
                    if (response.redirected) {
                        window.location.href = response.url;
                    }
                });
            })
            .catch((error) => {
                span.recordException(error);
            });
    });

    return false;
}
window.vote = vote;
