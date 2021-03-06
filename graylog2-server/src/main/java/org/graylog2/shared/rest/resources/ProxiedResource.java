/**
 * This file is part of Graylog.
 *
 * Graylog is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Graylog is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Graylog.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.graylog2.shared.rest.resources;

import org.graylog2.cluster.Node;
import org.graylog2.cluster.NodeNotFoundException;
import org.graylog2.cluster.NodeService;
import org.graylog2.rest.RemoteInterfaceProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import retrofit2.Call;
import retrofit2.Response;

import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public abstract class ProxiedResource extends RestResource {
    private static final Logger LOG = LoggerFactory.getLogger(ProxiedResource.class);

    protected final String authenticationToken;
    protected final NodeService nodeService;

    protected final RemoteInterfaceProvider remoteInterfaceProvider;

    protected ProxiedResource(@Context HttpHeaders httpHeaders, NodeService nodeService, RemoteInterfaceProvider remoteInterfaceProvider) {
        this.nodeService = nodeService;
        this.remoteInterfaceProvider = remoteInterfaceProvider;
        final List<String> authenticationTokens = httpHeaders.getRequestHeader("Authorization");
        if (authenticationTokens != null && authenticationTokens.size() >= 1) {
            this.authenticationToken = authenticationTokens.get(0);
        } else {
            this.authenticationToken = null;
        }
    }

    protected <RemoteInterfaceType, RemoteCallResponseType> Map<String, Optional<RemoteCallResponseType>> getForAllNodes(Function<RemoteInterfaceType,Call<RemoteCallResponseType>> fn, Function<String, Optional<RemoteInterfaceType>> interfaceProvider) {
        return getForAllNodes(fn, interfaceProvider, Function.identity());
    }

    protected <RemoteInterfaceType, FinalResponseType, RemoteCallResponseType> Map<String, Optional<FinalResponseType>> getForAllNodes(Function<RemoteInterfaceType, Call<RemoteCallResponseType>> fn, Function<String, Optional<RemoteInterfaceType>> interfaceProvider, Function<RemoteCallResponseType, FinalResponseType> transformer) {
        return this.nodeService.allActive()
            .entrySet()
            .stream()
            .collect(Collectors.toMap(Map.Entry::getKey, entry -> {
                final Optional<RemoteInterfaceType> remoteInterface = interfaceProvider.apply(entry.getKey());
                if (!remoteInterface.isPresent()) {
                    return Optional.empty();
                }
                final Call<RemoteCallResponseType> call = fn.apply(remoteInterface.get());
                try {
                    final Response<RemoteCallResponseType> response = call.execute();
                    if (response.isSuccess()) {
                        return Optional.of(transformer.apply(response.body()));
                    } else {
                        LOG.warn("Unable to call " + call.request().url().toString() + " on node <" + entry.getKey() + ">, result: " + response.message());
                        return Optional.empty();
                    }
                } catch (IOException e) {
                    LOG.warn("Unable to call " + call.request().url().toString() + " on node <" + entry.getKey() + ">, caught exception:", e);
                    return Optional.empty();
                }
            }));
    }

    protected <RemoteInterfaceType> Function<String, Optional<RemoteInterfaceType>> createRemoteInterfaceProvider(Class<RemoteInterfaceType> interfaceClass) {
        return (nodeId) -> {
            try {
                final Node targetNode = nodeService.byNodeId(nodeId);
                return Optional.of(this.remoteInterfaceProvider.get(targetNode, this.authenticationToken, interfaceClass));
            } catch (NodeNotFoundException e) {
                LOG.warn("Node <" + nodeId + "> not found while trying to call " + interfaceClass.getName() + " on it.");
                return Optional.empty();
            }
        };
    }
}
