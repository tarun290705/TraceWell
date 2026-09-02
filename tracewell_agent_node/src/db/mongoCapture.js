'use strict';

function describeCommand(event) {
  const commandName = event.commandName;
  const command = event.command || {};
  const collection = command[commandName];

  const description = { command: commandName, collection };

  if (command.filter && typeof command.filter === 'object') {
    description.filter_keys = Object.keys(command.filter);
  }

  if (Array.isArray(command.documents)) {
    description.document_count = command.documents.length;
    if (command.documents[0] && typeof command.documents[0] === 'object') {
      description.document_keys = Object.keys(command.documents[0]);
    }
  }

  if (Array.isArray(command.updates) && command.updates[0]) {
    const u = command.updates[0].u || {};
    description.update_keys = Object.keys(u.$set || u);
  }

  if (command.sort) {
    description.sort = command.sort;
  }

  if (typeof command.limit === 'number') {
    description.limit = command.limit;
  }

  return description;
}

function instrumentMongoCommands(emitter, tracer) {
  const openSpans = new Map();

  emitter.on('commandStarted', (event) => {
    if (!tracer.currentSpanId) {
      return;
    }

    const span = tracer.startSpan('db_query', describeCommand(event));
    openSpans.set(event.requestId, span);
  });

  emitter.on('commandSucceeded', (event) => {
    const span = openSpans.get(event.requestId);
    if (span) {
      tracer.endSpan(span, 'ok');
      openSpans.delete(event.requestId);
    }
  });

  emitter.on('commandFailed', (event) => {
    const span = openSpans.get(event.requestId);
    if (span) {
      tracer.endSpan(span, 'error', event.failure);
      openSpans.delete(event.requestId);
    }
  });
}

module.exports = { instrumentMongoCommands, describeCommand };