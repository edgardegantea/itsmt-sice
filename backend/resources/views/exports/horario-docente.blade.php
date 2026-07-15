<table>
    <thead>
        <tr>
            <th>Hora</th>
            <th>Lunes</th>
            <th>Martes</th>
            <th>Miércoles</th>
            <th>Jueves</th>
            <th>Viernes</th>
            <th>Sábado</th>
        </tr>
    </thead>
    <tbody>
        @foreach($slots as $slot)
        <tr>
            <td>{{ $slot }}</td>
            @foreach(['lunes','martes','miercoles','jueves','viernes','sabado'] as $dia)
                @php $info = $celda($dia, $slot) @endphp
                <td>
                    @if($info)
                        {{ $info['linea1'] }}<br>{{ $info['linea2'] }}
                    @endif
                </td>
            @endforeach
        </tr>
        @endforeach
    </tbody>
</table>
